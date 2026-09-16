package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/models"

	"github.com/gin-gonic/gin"
)

// GetFarmerByCitizenID searches existing farmer data by 13-digit ID
func GetFarmerByCitizenID(c *gin.Context) {
	cid := c.Param("citizen_id")
	if len(cid) != 13 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "เลขประจำตัวประชาชนต้องมี 13 หลัก"})
		return
	}

	var farmer models.Farmer
	query := `SELECT citizen_id, fullname, gender, age, address, occupation, plant_type, created_at, updated_at
	          FROM farmers WHERE citizen_id = ?`
	err := database.DB.QueryRow(query, cid).Scan(
		&farmer.CitizenID, &farmer.Fullname, &farmer.Gender, &farmer.Age,
		&farmer.Address, &farmer.Occupation, &farmer.PlantType,
		&farmer.CreatedAt, &farmer.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"message": "ไม่พบประวัติเกษตรกรรายนี้ในระบบ"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, farmer)
}

// CreateAssessment processes submission, calculates Risk Matrix, and saves to database
func CreateAssessment(c *gin.Context) {
	var sub models.AssessmentSubmission
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	if sub.EvalDate == "" {
		sub.EvalDate = time.Now().Format("2006-01-02")
	}
	if sub.HealthCenter == "" {
		sub.HealthCenter = "รพ.สต. ประจำตำบล"
	}
	if sub.InterviewerName == "" {
		sub.InterviewerName = "เจ้าหน้าที่สาธารณสุข"
	}

	// Calculate Score and Risk Matrix
	scoreA, scoreB, totalScore, highestGroup, riskLevel, requireBlood := models.CalculateRiskMatrix(
		sub.AnswersA, sub.AnswersB, sub.Symptoms,
	)

	// If no blood result specified but required, default or keep what was entered
	bloodResult := sub.CholinesteraseResult
	if bloodResult == "" {
		if requireBlood {
			bloodResult = "รอรับการตรวจ"
		} else {
			bloodResult = "ปกติ"
		}
	}

	// 1. Upsert farmer record
	_, err := database.DB.Exec(`
		INSERT INTO farmers (citizen_id, fullname, gender, age, address, occupation, plant_type, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(citizen_id) DO UPDATE SET
			fullname = excluded.fullname,
			gender = excluded.gender,
			age = excluded.age,
			address = excluded.address,
			occupation = excluded.occupation,
			plant_type = excluded.plant_type,
			updated_at = CURRENT_TIMESTAMP
	`, sub.CitizenID, sub.Fullname, sub.Gender, sub.Age, sub.Address, sub.Occupation, sub.PlantType)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "บันทึกข้อมูลเกษตรกรไม่สำเร็จ: " + err.Error()})
		return
	}

	// 2. Insert assessment record
	assessmentID := fmt.Sprintf("eval-%s-%d", sub.CitizenID, time.Now().Unix())
	symptomsJSON, _ := json.Marshal(sub.Symptoms)
	chemJSON, _ := json.Marshal(sub.ChemicalNames)
	answersAJSON, _ := json.Marshal(sub.AnswersA)
	answersBJSON, _ := json.Marshal(sub.AnswersB)

	reqBloodInt := 0
	if requireBlood {
		reqBloodInt = 1
	}

	_, err = database.DB.Exec(`
		INSERT INTO assessments (
			id, citizen_id, eval_date, interviewer_name, health_center,
			score_a, score_b, total_score, highest_symptom_group,
			symptoms, risk_level, require_blood_test, cholinesterase_result, chemical_names,
			answers_a, answers_b
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, assessmentID, sub.CitizenID, sub.EvalDate, sub.InterviewerName, sub.HealthCenter,
		scoreA, scoreB, totalScore, highestGroup,
		string(symptomsJSON), riskLevel, reqBloodInt, bloodResult, string(chemJSON),
		string(answersAJSON), string(answersBJSON),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "บันทึกแบบประเมินไม่สำเร็จ: " + err.Error()})
		return
	}

	record := models.AssessmentRecord{
		ID:                   assessmentID,
		CitizenID:            sub.CitizenID,
		Fullname:             sub.Fullname,
		Gender:               sub.Gender,
		Age:                  sub.Age,
		Address:              sub.Address,
		Occupation:           sub.Occupation,
		PlantType:            sub.PlantType,
		EvalDate:             sub.EvalDate,
		InterviewerName:      sub.InterviewerName,
		HealthCenter:         sub.HealthCenter,
		ScoreA:               scoreA,
		ScoreB:               scoreB,
		TotalScore:           totalScore,
		HighestSymptomGroup:  highestGroup,
		Symptoms:             sub.Symptoms,
		RiskLevel:            riskLevel,
		RequireBloodTest:     requireBlood,
		CholinesteraseResult: bloodResult,
		ChemicalNames:        sub.ChemicalNames,
		CreatedAt:            time.Now().Format("2006-01-02 15:04:05"),
	}

	c.JSON(http.StatusCreated, record)
}

// GetAssessments retrieves all assessments with filtering and searching
func GetAssessments(c *gin.Context) {
	search := c.Query("q")
	riskFilter := c.Query("risk_level")

	query := `
		SELECT a.id, a.citizen_id, f.fullname, f.gender, f.age, f.address, f.occupation, f.plant_type,
		       a.eval_date, a.interviewer_name, a.health_center,
		       a.score_a, a.score_b, a.total_score, a.highest_symptom_group,
		       a.symptoms, a.risk_level, a.require_blood_test, a.cholinesterase_result,
		       a.chemical_names, a.created_at
		FROM assessments a
		JOIN farmers f ON a.citizen_id = f.citizen_id
		WHERE 1=1
	`
	args := []interface{}{}

	if search != "" {
		query += ` AND (f.fullname LIKE ? OR a.citizen_id LIKE ? OR f.address LIKE ?)`
		likePattern := "%" + search + "%"
		args = append(args, likePattern, likePattern, likePattern)
	}

	if riskFilter != "" && riskFilter != "ALL" {
		query += ` AND a.risk_level = ?`
		args = append(args, riskFilter)
	}

	query += ` ORDER BY a.eval_date DESC, a.created_at DESC`

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	records := []models.AssessmentRecord{}
	for rows.Next() {
		var rec models.AssessmentRecord
		var symptomsStr, chemStr sql.NullString
		var requireBloodInt int

		err := rows.Scan(
			&rec.ID, &rec.CitizenID, &rec.Fullname, &rec.Gender, &rec.Age, &rec.Address, &rec.Occupation, &rec.PlantType,
			&rec.EvalDate, &rec.InterviewerName, &rec.HealthCenter,
			&rec.ScoreA, &rec.ScoreB, &rec.TotalScore, &rec.HighestSymptomGroup,
			&symptomsStr, &rec.RiskLevel, &requireBloodInt, &rec.CholinesteraseResult,
			&chemStr, &rec.CreatedAt,
		)
		if err != nil {
			continue
		}

		rec.RequireBloodTest = (requireBloodInt == 1)
		if symptomsStr.Valid && symptomsStr.String != "" {
			_ = json.Unmarshal([]byte(symptomsStr.String), &rec.Symptoms)
		}
		if chemStr.Valid && chemStr.String != "" {
			_ = json.Unmarshal([]byte(chemStr.String), &rec.ChemicalNames)
		}

		records = append(records, rec)
	}

	c.JSON(http.StatusOK, records)
}

// GetAssessmentByID retrieves single assessment record
func GetAssessmentByID(c *gin.Context) {
	id := c.Param("id")

	query := `
		SELECT a.id, a.citizen_id, f.fullname, f.gender, f.age, f.address, f.occupation, f.plant_type,
		       a.eval_date, a.interviewer_name, a.health_center,
		       a.score_a, a.score_b, a.total_score, a.highest_symptom_group,
		       a.symptoms, a.risk_level, a.require_blood_test, a.cholinesterase_result,
		       a.chemical_names, a.created_at
		FROM assessments a
		JOIN farmers f ON a.citizen_id = f.citizen_id
		WHERE a.id = ?
	`
	var rec models.AssessmentRecord
	var symptomsStr, chemStr sql.NullString
	var requireBloodInt int

	err := database.DB.QueryRow(query, id).Scan(
		&rec.ID, &rec.CitizenID, &rec.Fullname, &rec.Gender, &rec.Age, &rec.Address, &rec.Occupation, &rec.PlantType,
		&rec.EvalDate, &rec.InterviewerName, &rec.HealthCenter,
		&rec.ScoreA, &rec.ScoreB, &rec.TotalScore, &rec.HighestSymptomGroup,
		&symptomsStr, &rec.RiskLevel, &requireBloodInt, &rec.CholinesteraseResult,
		&chemStr, &rec.CreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลแบบประเมิน"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rec.RequireBloodTest = (requireBloodInt == 1)
	if symptomsStr.Valid && symptomsStr.String != "" {
		_ = json.Unmarshal([]byte(symptomsStr.String), &rec.Symptoms)
	}
	if chemStr.Valid && chemStr.String != "" {
		_ = json.Unmarshal([]byte(chemStr.String), &rec.ChemicalNames)
	}

	c.JSON(http.StatusOK, rec)
}

// DeleteAssessment deletes an assessment record
func DeleteAssessment(c *gin.Context) {
	id := c.Param("id")

	res, err := database.DB.Exec("DELETE FROM assessments WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบข้อมูลที่ต้องการลบ"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ลบข้อมูลแบบประเมินเรียบร้อยแล้ว", "id": id})
}

// UpdateAssessment updates an existing assessment record
func UpdateAssessment(c *gin.Context) {
	id := c.Param("id")

	var sub models.AssessmentSubmission
	if err := c.ShouldBindJSON(&sub); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	scoreA, scoreB, tot, highest, level, requireBlood := models.CalculateRiskMatrix(
		sub.AnswersA, sub.AnswersB, sub.Symptoms,
	)

	symJSON, _ := json.Marshal(sub.Symptoms)
	chemJSON, _ := json.Marshal(sub.ChemicalNames)
	ansAJSON, _ := json.Marshal(sub.AnswersA)
	ansBJSON, _ := json.Marshal(sub.AnswersB)

	requireBloodInt := 0
	if requireBlood {
		requireBloodInt = 1
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	updateFarmerQ := `
		UPDATE farmers SET
			fullname = ?, gender = ?, age = ?, address = ?, occupation = ?, plant_type = ?, updated_at = CURRENT_TIMESTAMP
		WHERE citizen_id = ?
	`
	_, err = tx.Exec(updateFarmerQ, sub.Fullname, sub.Gender, sub.Age, sub.Address, sub.Occupation, sub.PlantType, sub.CitizenID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตข้อมูลเกษตรกรได้: " + err.Error()})
		return
	}

	updateAssessQ := `
		UPDATE assessments SET
			eval_date = ?, interviewer_name = ?, health_center = ?,
			score_a = ?, score_b = ?, total_score = ?, highest_symptom_group = ?,
			symptoms = ?, risk_level = ?, require_blood_test = ?, cholinesterase_result = ?,
			chemical_names = ?, answers_a = ?, answers_b = ?
		WHERE id = ?
	`
	res, err := tx.Exec(updateAssessQ,
		sub.EvalDate, sub.InterviewerName, sub.HealthCenter,
		scoreA, scoreB, tot, highest,
		string(symJSON), level, requireBloodInt, sub.CholinesteraseResult,
		string(chemJSON), string(ansAJSON), string(ansBJSON),
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอัปเดตแบบประเมินได้: " + err.Error()})
		return
	}

	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบแบบประเมินที่ต้องการแก้ไข"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	record := models.AssessmentRecord{
		ID:                   id,
		CitizenID:            sub.CitizenID,
		Fullname:             sub.Fullname,
		Gender:               sub.Gender,
		Age:                  sub.Age,
		Address:              sub.Address,
		Occupation:           sub.Occupation,
		PlantType:            sub.PlantType,
		EvalDate:             sub.EvalDate,
		InterviewerName:      sub.InterviewerName,
		HealthCenter:         sub.HealthCenter,
		ScoreA:               scoreA,
		ScoreB:               scoreB,
		TotalScore:           tot,
		HighestSymptomGroup:  highest,
		Symptoms:             sub.Symptoms,
		RiskLevel:            level,
		RequireBloodTest:     requireBlood,
		CholinesteraseResult: sub.CholinesteraseResult,
		ChemicalNames:        sub.ChemicalNames,
		AnswersA:             sub.AnswersA,
		AnswersB:             sub.AnswersB,
	}

	c.JSON(http.StatusOK, record)
}

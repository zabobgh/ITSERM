package handlers

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"

	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/models"

	"github.com/gin-gonic/gin"
)

// GetDashboardStats aggregates dashboard metrics and charts
func GetDashboardStats(c *gin.Context) {
	stats := models.DashboardStats{
		RiskDistribution: map[string]int{
			"มีความเสี่ยงต่ำ":       0,
			"มีความเสี่ยงปานกลาง":   0,
			"มีความเสี่ยงค่อนข้างสูง": 0,
			"มีความเสี่ยงสูง":       0,
			"มีความเสี่ยงสูงมาก":    0,
		},
		BloodDistribution: map[string]int{
			"ปกติ":        0,
			"ปลอดภัย":     0,
			"มีความเสี่ยง":  0,
			"ไม่ปลอดภัย":   0,
		},
		RecentPriorityCases: []models.AssessmentRecord{},
	}

	// Total assessments
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM assessments").Scan(&stats.TotalFarmers)

	// High risk count
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE risk_level IN ('มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก')
	`).Scan(&stats.HighRiskFarmers)

	// Tested blood count
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE cholinesterase_result IS NOT NULL
		  AND cholinesterase_result != ''
		  AND cholinesterase_result != 'รอรับการตรวจ'
	`).Scan(&stats.TestedBlood)

	// Unsafe blood count
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE cholinesterase_result IN ('มีความเสี่ยง', 'ไม่ปลอดภัย')
	`).Scan(&stats.UnsafeBlood)

	// Risk distribution
	riskRows, err := database.DB.Query("SELECT risk_level, COUNT(*) FROM assessments GROUP BY risk_level")
	if err == nil {
		defer riskRows.Close()
		for riskRows.Next() {
			var level string
			var count int
			if err := riskRows.Scan(&level, &count); err == nil {
				stats.RiskDistribution[level] = count
			}
		}
	}

	// Blood distribution
	bloodRows, err := database.DB.Query(`
		SELECT cholinesterase_result, COUNT(*) FROM assessments
		WHERE cholinesterase_result IS NOT NULL AND cholinesterase_result != ''
		GROUP BY cholinesterase_result
	`)
	if err == nil {
		defer bloodRows.Close()
		for bloodRows.Next() {
			var res string
			var count int
			if err := bloodRows.Scan(&res, &count); err == nil {
				stats.BloodDistribution[res] = count
			}
		}
	}

	// Priority cases (Highest risk & total score)
	priorityQuery := `
		SELECT a.id, a.citizen_id, f.fullname, f.gender, f.age, f.address, f.occupation, f.plant_type,
		       a.eval_date, a.interviewer_name, a.health_center,
		       a.score_a, a.score_b, a.total_score, a.highest_symptom_group,
		       a.symptoms, a.risk_level, a.require_blood_test, a.cholinesterase_result,
		       a.chemical_names, a.created_at
		FROM assessments a
		JOIN farmers f ON a.citizen_id = f.citizen_id
		ORDER BY a.total_score DESC, a.created_at DESC
		LIMIT 6
	`
	pRows, err := database.DB.Query(priorityQuery)
	if err == nil {
		defer pRows.Close()
		for pRows.Next() {
			var rec models.AssessmentRecord
			var symStr, chemStr sql.NullString
			var reqBloodInt int

			if err := pRows.Scan(
				&rec.ID, &rec.CitizenID, &rec.Fullname, &rec.Gender, &rec.Age, &rec.Address, &rec.Occupation, &rec.PlantType,
				&rec.EvalDate, &rec.InterviewerName, &rec.HealthCenter,
				&rec.ScoreA, &rec.ScoreB, &rec.TotalScore, &rec.HighestSymptomGroup,
				&symStr, &rec.RiskLevel, &reqBloodInt, &rec.CholinesteraseResult,
				&chemStr, &rec.CreatedAt,
			); err == nil {
				rec.RequireBloodTest = (reqBloodInt == 1)
				if symStr.Valid && symStr.String != "" {
					_ = json.Unmarshal([]byte(symStr.String), &rec.Symptoms)
				}
				if chemStr.Valid && chemStr.String != "" {
					_ = json.Unmarshal([]byte(chemStr.String), &rec.ChemicalNames)
				}
				stats.RecentPriorityCases = append(stats.RecentPriorityCases, rec)
			}
		}
	}

	c.JSON(http.StatusOK, stats)
}

// GetReportOCC01 generates official OCC-นบ01 report summary for primary care unit
func GetReportOCC01(c *gin.Context) {
	healthCenter := c.DefaultQuery("health_center", "รพ.สต. บ้านคลองสวน")
	fiscalYear := c.DefaultQuery("fiscal_year", "2569")

	var report models.ReportOCC01
	report.HealthCenter = healthCenter
	report.FiscalYear = fiscalYear

	// 5. จำนวนเกษตรกรที่ได้รับการประเมินความเสี่ยง
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM assessments").Scan(&report.TotalEvaluated)

	// ↳ เสี่ยงค่อนข้างสูง ถึงสูงมาก รวม
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE risk_level IN ('มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก')
	`).Scan(&report.HighRiskEvaluated)

	// 6. จำนวนเกษตรกรที่ได้รับการเจาะเลือดตรวจคัดกรอง
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE cholinesterase_result IN ('ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย')
	`).Scan(&report.TotalBloodTested)

	// ↳ ผลการตรวจพบว่า "มีความเสี่ยง" และ "ไม่ปลอดภัย" รวม
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE cholinesterase_result IN ('มีความเสี่ยง', 'ไม่ปลอดภัย')
	`).Scan(&report.UnsafeBloodCount)

	// 11. ได้รับคำแนะนำการป้องกันอันตราย (เท่ากับจำนวนผู้ประเมินทั้งหมด)
	report.TotalAdvised = report.TotalEvaluated

	c.JSON(http.StatusOK, report)
}

// GetReportOCC02 generates official OCC-นบ02 report summary for provincial health office
func GetReportOCC02(c *gin.Context) {
	province := c.DefaultQuery("province", "สมุทรสาคร")
	fiscalYear := c.DefaultQuery("fiscal_year", "2569")

	var report models.ReportOCC02
	report.Province = province
	report.FiscalYear = fiscalYear

	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE risk_level IN ('มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก')
	`).Scan(&report.TotalHighRiskCumulative)

	var testedHighRisk int
	_ = database.DB.QueryRow(`
		SELECT COUNT(*) FROM assessments
		WHERE risk_level IN ('มีความเสี่ยงค่อนข้างสูง', 'มีความเสี่ยงสูง', 'มีความเสี่ยงสูงมาก')
		  AND cholinesterase_result IN ('ปกติ', 'ปลอดภัย', 'มีความเสี่ยง', 'ไม่ปลอดภัย')
	`).Scan(&testedHighRisk)

	report.TotalScreenedTarget = report.TotalHighRiskCumulative
	if report.TotalHighRiskCumulative > 0 {
		report.BloodTestingCoverage = math.Round((float64(testedHighRisk)/float64(report.TotalHighRiskCumulative))*1000) / 10
	} else {
		report.BloodTestingCoverage = 100.0
	}

	c.JSON(http.StatusOK, report)
}

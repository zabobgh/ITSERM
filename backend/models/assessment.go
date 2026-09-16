package models

// Farmer represents a registered farmer
type Farmer struct {
	CitizenID  string `json:"citizen_id"`
	Fullname   string `json:"fullname"`
	Gender     string `json:"gender"`
	Age        int    `json:"age"`
	Address    string `json:"address"`
	Occupation string `json:"occupation"`
	PlantType  string `json:"plant_type"`
	CreatedAt  string `json:"created_at,omitempty"`
	UpdatedAt  string `json:"updated_at,omitempty"`
}

// AssessmentSubmission represents incoming assessment form data
type AssessmentSubmission struct {
	CitizenID            string            `json:"citizen_id" binding:"required"`
	Fullname             string            `json:"fullname" binding:"required"`
	Gender               string            `json:"gender" binding:"required"`
	Age                  int               `json:"age" binding:"required"`
	Address              string            `json:"address"`
	Occupation           string            `json:"occupation"`
	PlantType            string            `json:"plant_type"`
	EvalDate             string            `json:"eval_date"`
	InterviewerName      string            `json:"interviewer_name"`
	HealthCenter         string            `json:"health_center"`
	AnswersA             map[string]int    `json:"answers_a"` // q9 - q17 (value 1, 2, 3)
	AnswersB             map[string]int    `json:"answers_b"` // q18 - q23 (value 1, 2, 3)
	Symptoms             []string          `json:"symptoms"`
	CholinesteraseResult string            `json:"cholinesterase_result"` // ปกติ, ปลอดภัย, มีความเสี่ยง, ไม่ปลอดภัย
	ChemicalNames        []string          `json:"chemical_names"`
}

// AssessmentRecord represents a stored assessment with evaluated results
type AssessmentRecord struct {
	ID                   string            `json:"id"`
	CitizenID            string            `json:"citizen_id"`
	Fullname             string            `json:"fullname"`
	Gender               string            `json:"gender"`
	Age                  int               `json:"age"`
	Address              string            `json:"address"`
	Occupation           string            `json:"occupation"`
	PlantType            string            `json:"plant_type"`
	EvalDate             string            `json:"eval_date"`
	InterviewerName      string            `json:"interviewer_name"`
	HealthCenter         string            `json:"health_center"`
	ScoreA               int               `json:"score_a"`
	ScoreB               int               `json:"score_b"`
	TotalScore           int               `json:"total_score"`
	HighestSymptomGroup  int               `json:"highest_symptom_group"`
	Symptoms             []string          `json:"symptoms"`
	RiskLevel            string            `json:"risk_level"`
	RequireBloodTest     bool              `json:"require_blood_test"`
	CholinesteraseResult string            `json:"cholinesterase_result"`
	ChemicalNames        []string          `json:"chemical_names"`
	AnswersA             map[string]int    `json:"answers_a,omitempty"`
	AnswersB             map[string]int    `json:"answers_b,omitempty"`
	CreatedAt            string            `json:"created_at"`
}

// DashboardStats represents KPI and aggregation statistics
type DashboardStats struct {
	TotalFarmers        int            `json:"total_farmers"`
	HighRiskFarmers     int            `json:"high_risk_farmers"`
	TestedBlood         int            `json:"tested_blood"`
	UnsafeBlood         int            `json:"unsafe_blood"`
	RiskDistribution    map[string]int `json:"risk_distribution"`
	BloodDistribution   map[string]int `json:"blood_distribution"`
	RecentPriorityCases []AssessmentRecord `json:"recent_priority_cases"`
}

// ReportOCC01 represents OCC-นบ01 (รพ.สต. level) summary
type ReportOCC01 struct {
	HealthCenter           string `json:"health_center"`
	FiscalYear             string `json:"fiscal_year"`
	TotalEvaluated         int    `json:"total_evaluated"`          // ข้อ 5: จำนวนเกษตรกรที่ได้รับการประเมินความเสี่ยง
	HighRiskEvaluated      int    `json:"high_risk_evaluated"`      // ↳ มีความเสี่ยงค่อนข้างสูง ถึงสูงมาก
	TotalBloodTested       int    `json:"total_blood_tested"`       // ข้อ 6: จำนวนเกษตรกรที่ได้รับการเจาะเลือดตรวจคัดกรอง
	UnsafeBloodCount       int    `json:"unsafe_blood_count"`       // ↳ ผลตรวจพบว่า "มีความเสี่ยง" และ "ไม่ปลอดภัย" รวม
	TotalAdvised           int    `json:"total_advised"`            // ข้อ 11: ได้รับคำแนะนำการป้องกันอันตราย
}

// ReportOCC02 represents OCC-นบ02 (สสจ. level) summary
type ReportOCC02 struct {
	Province               string  `json:"province"`
	FiscalYear             string  `json:"fiscal_year"`
	TotalHighRiskCumulative int     `json:"total_high_risk_cumulative"`
	TotalScreenedTarget     int     `json:"total_screened_target"`
	BloodTestingCoverage    float64 `json:"blood_testing_coverage"` // percentage
}

// Group 1: Respiratory & Skin
var SymptomsGroup1 = map[string]bool{
	"ไอ": true, "แสบจมูก": true, "เจ็บคอ คอแห้ง": true, "หายใจติดขัด": true,
	"ตาแดง/แสบตา/คันตา": true, "น้ำมูกไหล": true, "น้ำตาไหล": true,
	"คันผิวหนัง/ผิวแห้ง/ผิวแตก": true, "ผื่นคัน/ตุ่มพุพอง": true, "ปวดแสบร้อนผิวหนัง": true,
}

// Group 2: Peripheral Nervous System & Digestive
var SymptomsGroup2 = map[string]bool{
	"อ่อนเพลีย": true, "อาการชา": true, "ใจสั่น": true, "เวียนศีรษะ": true,
	"ปวดศีรษะ": true, "นอนหลับไม่สนิท": true, "คลื่นไส้ อาเจียน": true,
	"ปวดท้อง": true, "ท้องเสีย": true, "เหงื่อออก": true, "เจ็บหน้าอก/แน่นหน้าอก": true, "อ่อนล้า": true,
}

// Group 3: Central Nervous System / Severe
var SymptomsGroup3 = map[string]bool{
	"ตาพร่ามัว": true, "หนังตากระตุก": true, "กล้ามเนื้อเกร็ง": true,
	"เป็นตะคริว": true, "มือสั่น": true, "เดินโซเซ": true,
	"น้ำลายไหลฟูมปาก": true, "ลมชัก": true, "หมดสติ/ไม่รู้สึกตัว": true,
}

// CalculateRiskMatrix calculates scores and evaluates risk level according to DDC criteria
func CalculateRiskMatrix(answersA map[string]int, answersB map[string]int, symptoms []string) (int, int, int, int, string, bool) {
	scoreA := 0
	for _, val := range answersA {
		scoreA += val
	}

	scoreB := 0
	for _, val := range answersB {
		scoreB += val
	}

	totalScore := scoreA + scoreB

	// Determine highest symptom group
	highestGroup := 0
	for _, sym := range symptoms {
		if SymptomsGroup3[sym] {
			if highestGroup < 3 {
				highestGroup = 3
			}
		} else if SymptomsGroup2[sym] {
			if highestGroup < 2 {
				highestGroup = 2
			}
		} else if SymptomsGroup1[sym] {
			if highestGroup < 1 {
				highestGroup = 1
			}
		}
	}

	riskLevel := "มีความเสี่ยงต่ำ"

	if totalScore <= 24 { // 15 - 24 points
		switch highestGroup {
		case 0:
			riskLevel = "มีความเสี่ยงต่ำ"
		case 1:
			riskLevel = "มีความเสี่ยงปานกลาง"
		case 2:
			riskLevel = "มีความเสี่ยงค่อนข้างสูง"
		case 3:
			riskLevel = "มีความเสี่ยงสูง"
		}
	} else if totalScore <= 30 { // 25 - 30 points
		switch highestGroup {
		case 0:
			riskLevel = "มีความเสี่ยงปานกลาง"
		case 1:
			riskLevel = "มีความเสี่ยงค่อนข้างสูง"
		case 2:
			riskLevel = "มีความเสี่ยงสูง"
		case 3:
			riskLevel = "มีความเสี่ยงสูง"
		}
	} else { // 31 - 45 points
		switch highestGroup {
		case 0:
			riskLevel = "มีความเสี่ยงค่อนข้างสูง"
		case 1:
			riskLevel = "มีความเสี่ยงสูง"
		case 2:
			riskLevel = "มีความเสี่ยงสูง"
		case 3:
			riskLevel = "มีความเสี่ยงสูงมาก"
		}
	}

	requireBloodTest := false
	if riskLevel == "มีความเสี่ยงค่อนข้างสูง" || riskLevel == "มีความเสี่ยงสูง" || riskLevel == "มีความเสี่ยงสูงมาก" {
		requireBloodTest = true
	}

	return scoreA, scoreB, totalScore, highestGroup, riskLevel, requireBloodTest
}

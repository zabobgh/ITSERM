package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// InitDB initializes the SQLite database with WAL mode and schema
func InitDB(dbPath string) (*sql.DB, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create db directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite database: %w", err)
	}

	// Performance Pragmas
	pragmas := []string{
		"PRAGMA journal_mode = WAL;",
		"PRAGMA synchronous = NORMAL;",
		"PRAGMA foreign_keys = ON;",
		"PRAGMA busy_timeout = 5000;",
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			log.Printf("Warning: failed to execute pragma '%s': %v", pragma, err)
		}
	}

	DB = db

	if err := migrate(); err != nil {
		return nil, fmt.Errorf("failed to run database migration: %w", err)
	}

	if err := seedInitialData(); err != nil {
		log.Printf("Seed warning: %v", err)
	}

	return db, nil
}

func migrate() error {
	createTablesQuery := `
	CREATE TABLE IF NOT EXISTS farmers (
		citizen_id TEXT PRIMARY KEY,
		fullname TEXT NOT NULL,
		gender TEXT NOT NULL,
		age INTEGER NOT NULL,
		address TEXT,
		occupation TEXT,
		plant_type TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS assessments (
		id TEXT PRIMARY KEY,
		citizen_id TEXT NOT NULL,
		eval_date TEXT NOT NULL,
		interviewer_name TEXT NOT NULL,
		health_center TEXT NOT NULL,
		score_a INTEGER NOT NULL,
		score_b INTEGER NOT NULL,
		total_score INTEGER NOT NULL,
		highest_symptom_group INTEGER NOT NULL,
		symptoms TEXT,
		risk_level TEXT NOT NULL,
		require_blood_test INTEGER NOT NULL DEFAULT 0,
		cholinesterase_result TEXT,
		chemical_names TEXT,
		answers_a TEXT,
		answers_b TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (citizen_id) REFERENCES farmers(citizen_id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_assessments_citizen_id ON assessments(citizen_id);
	CREATE INDEX IF NOT EXISTS idx_assessments_risk_level ON assessments(risk_level);
	CREATE INDEX IF NOT EXISTS idx_assessments_eval_date ON assessments(eval_date);
	`

	_, err := DB.Exec(createTablesQuery)
	return err
}

func seedInitialData() error {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM assessments").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// Already seeded
		return nil
	}

	type SeedCase struct {
		CitizenID            string
		Fullname             string
		Gender               string
		Age                  int
		Address              string
		Occupation           string
		PlantType            string
		EvalDate             string
		InterviewerName      string
		HealthCenter         string
		ScoreA               int
		ScoreB               int
		TotalScore           int
		HighestSymptomGroup  int
		Symptoms             []string
		RiskLevel            string
		RequireBloodTest     int
		CholinesteraseResult string
		ChemicalNames        []string
	}

	seeds := []SeedCase{
		{
			CitizenID:            "1729900234123",
			Fullname:             "นายสมศักดิ์ ขยันงาน",
			Gender:               "ชาย",
			Age:                  52,
			Address:              "12 หมู่ 3 ต.บ้านแพ้ว",
			Occupation:           "1. เพาะปลูก (ทำเอง)",
			PlantType:            "ทำสวน (ผลไม้/ทุเรียน/ส้ม)",
			EvalDate:             "2026-09-02",
			InterviewerName:      "นสม. สุภาพร",
			HealthCenter:         "รพ.สต. บ้านคลองสวน",
			ScoreA:               24,
			ScoreB:               15,
			TotalScore:           39,
			HighestSymptomGroup:  2,
			Symptoms:             []string{"เวียนศีรษะ", "คลื่นไส้ อาเจียน", "คันผิวหนัง/ผิวแห้ง/ผิวแตก"},
			RiskLevel:            "มีความเสี่ยงสูง",
			RequireBloodTest:     1,
			CholinesteraseResult: "มีความเสี่ยง",
			ChemicalNames:        []string{"คลอร์ไพริฟอส", "ไกลโฟเสต"},
		},
		{
			CitizenID:            "3720100456789",
			Fullname:             "นางบัวลอย สวนผล",
			Gender:               "หญิง",
			Age:                  48,
			Address:              "45/1 หมู่ 5 ต.หลักสอง",
			Occupation:           "2. เพาะปลูก (รับจ้าง)",
			PlantType:            "ทำสวน (พืชผัก/พริก/มะเขือ)",
			EvalDate:             "2026-09-08",
			InterviewerName:      "นสม. สมร",
			HealthCenter:         "รพ.สต. บ้านคลองสวน",
			ScoreA:               12,
			ScoreB:               7,
			TotalScore:           19,
			HighestSymptomGroup:  0,
			Symptoms:             []string{},
			RiskLevel:            "มีความเสี่ยงต่ำ",
			RequireBloodTest:     0,
			CholinesteraseResult: "ปลอดภัย",
			ChemicalNames:        []string{"อะบาเมกติน"},
		},
		{
			CitizenID:            "1739900123999",
			Fullname:             "นายประสิทธิ์ พ่นยาไว",
			Gender:               "ชาย",
			Age:                  39,
			Address:              "88 หมู่ 1 ต.เกษตรพัฒนา",
			Occupation:           "3. รับจ้างฉีดพ่น",
			PlantType:            "ทำนา (ข้าว)",
			EvalDate:             "2026-09-12",
			InterviewerName:      "นสม. สุภาพร",
			HealthCenter:         "รพ.สต. บ้านคลองสวน",
			ScoreA:               26,
			ScoreB:               17,
			TotalScore:           43,
			HighestSymptomGroup:  3,
			Symptoms:             []string{"มือสั่น", "ตาพร่ามัว", "แน่นหน้าอก"},
			RiskLevel:            "มีความเสี่ยงสูงมาก",
			RequireBloodTest:     1,
			CholinesteraseResult: "ไม่ปลอดภัย",
			ChemicalNames:        []string{"พาราควอต", "คลอร์ไพริฟอส"},
		},
		{
			CitizenID:            "1100400567812",
			Fullname:             "นายจำนงค์ เกษตรสมบูรณ์",
			Gender:               "ชาย",
			Age:                  61,
			Address:              "23 หมู่ 2 ต.บางกระเจ้า",
			Occupation:           "1. เพาะปลูก (ทำเอง)",
			PlantType:            "ทำสวน (กล้วยไม้/ไม้ดอก)",
			EvalDate:             "2026-09-14",
			InterviewerName:      "เจ้าหน้าที่สาธารณสุข",
			HealthCenter:         "รพ.สต. บ้านคลองสวน",
			ScoreA:               19,
			ScoreB:               11,
			TotalScore:           30,
			HighestSymptomGroup:  1,
			Symptoms:             []string{"ไอ", "แสบจมูก"},
			RiskLevel:            "มีความเสี่ยงค่อนข้างสูง",
			RequireBloodTest:     1,
			CholinesteraseResult: "ปกติ",
			ChemicalNames:        []string{"ไซเพอร์เมทริน"},
		},
	}

	for _, s := range seeds {
		// Insert or ignore farmer
		_, err = DB.Exec(`
			INSERT OR IGNORE INTO farmers (citizen_id, fullname, gender, age, address, occupation, plant_type)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			s.CitizenID, s.Fullname, s.Gender, s.Age, s.Address, s.Occupation, s.PlantType,
		)
		if err != nil {
			return err
		}

		symptomsJSON, _ := json.Marshal(s.Symptoms)
		chemJSON, _ := json.Marshal(s.ChemicalNames)
		assessmentID := fmt.Sprintf("eval-%s-%s", s.CitizenID, s.EvalDate)

		_, err = DB.Exec(`
			INSERT OR REPLACE INTO assessments (
				id, citizen_id, eval_date, interviewer_name, health_center,
				score_a, score_b, total_score, highest_symptom_group,
				symptoms, risk_level, require_blood_test, cholinesterase_result, chemical_names
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			assessmentID, s.CitizenID, s.EvalDate, s.InterviewerName, s.HealthCenter,
			s.ScoreA, s.ScoreB, s.TotalScore, s.HighestSymptomGroup,
			string(symptomsJSON), s.RiskLevel, s.RequireBloodTest, s.CholinesteraseResult, string(chemJSON),
		)
		if err != nil {
			return err
		}
	}

	log.Println("Database seeded with initial Thai agricultural screening records.")
	return nil
}

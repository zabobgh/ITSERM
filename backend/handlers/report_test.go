package handlers

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/models"
)

func TestReportOCC02_CoverageFormula(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := database.InitDB(filepath.Join(t.TempDir(), "test_occ.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	r := gin.New()
	r.GET("/api/reports/occ02", GetReportOCC02)
	r.GET("/api/reports/occ01", GetReportOCC01)

	testCases := []struct {
		name          string
		requiredBlood int // High risk farmers requiring blood
		testedBlood   int // Farmers actually tested
		expectedPct   float64
	}{
		{
			name:          "20 required, 15 tested -> 75%",
			requiredBlood: 20,
			testedBlood:   15,
			expectedPct:   75.0,
		},
		{
			name:          "20 required, 20 tested -> 100%",
			requiredBlood: 20,
			testedBlood:   20,
			expectedPct:   100.0,
		},
		{
			name:          "20 required, 0 tested -> 0%",
			requiredBlood: 20,
			testedBlood:   0,
			expectedPct:   0.0,
		},
		{
			name:          "0 required -> 0% (prevent division by zero)",
			requiredBlood: 0,
			testedBlood:   0,
			expectedPct:   0.0,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clear tables
			if _, err := db.Exec("DELETE FROM assessments"); err != nil {
				t.Fatal(err)
			}
			if _, err := db.Exec("DELETE FROM farmers"); err != nil {
				t.Fatal(err)
			}

			// Insert farmers and assessments according to test scenario
			for i := 0; i < tc.requiredBlood; i++ {
				cid := fmt.Sprintf("100000000%04d", i)
				fQuery := `
					INSERT INTO farmers (citizen_id, fullname, gender, age)
					VALUES (?, ?, 'ชาย', 45)
				`
				if _, err := db.Exec(fQuery, cid, fmt.Sprintf("Farmer %d", i)); err != nil {
					t.Fatalf("insert farmer failed: %v", err)
				}

				riskLevel := "มีความเสี่ยงสูง"
				bloodResult := ""
				if i < tc.testedBlood {
					bloodResult = "ปกติ"
				}

				query := `
					INSERT INTO assessments (
						id, citizen_id, eval_date, interviewer_name, health_center,
						score_a, score_b, total_score, highest_symptom_group,
						risk_level, require_blood_test, cholinesterase_result, 
						created_at, answers_a, answers_b
					) VALUES (?, ?, '2026-09-16', 'QA Officer', 'รพ.สต.หลักสาม', 15, 15, 30, 2, ?, 1, ?, datetime('now'), '{}', '{}')
				`
				recId := fmt.Sprintf("rec-%04d", i)
				if _, err := db.Exec(query, recId, cid, riskLevel, bloodResult); err != nil {
					t.Fatalf("insert assessment failed: %v", err)
				}
			}

			// Request OCC-02
			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/api/reports/occ02?province=สมุทรสาคร&fiscal_year=2569", nil)
			r.ServeHTTP(w, req)

			if w.Code != 200 {
				t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
			}

			var occ02 models.ReportOCC02
			if err := json.Unmarshal(w.Body.Bytes(), &occ02); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if occ02.TotalHighRiskCumulative != tc.requiredBlood {
				t.Errorf("TotalHighRiskCumulative: expected %d, got %d", tc.requiredBlood, occ02.TotalHighRiskCumulative)
			}

			if occ02.BloodTestingCoverage != tc.expectedPct {
				t.Errorf("BloodTestingCoverage: expected %v, got %v", tc.expectedPct, occ02.BloodTestingCoverage)
			}
		})
	}
}

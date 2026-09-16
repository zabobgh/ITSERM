package handlers

import (
	"bytes"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"nbk-occ-system/backend/database"
	"nbk-occ-system/backend/models"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestAssessmentPersistenceAndDashboard(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := database.InitDB(filepath.Join(t.TempDir(), "qa.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if _, err := db.Exec("DELETE FROM assessments"); err != nil {
		t.Fatal(err)
	}
	r := gin.New()
	r.POST("/api/assessments", CreateAssessment)
	r.GET("/api/assessments/:id", GetAssessmentByID)
	r.GET("/api/assessments", GetAssessments)
	r.GET("/api/stats/dashboard", GetDashboardStats)
	raw, err := os.ReadFile("../../qa/risk-cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []models.AssessmentRecord
	if err = json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for _, tc := range cases {
		t.Run(tc.ID, func(t *testing.T) {
			sub := models.AssessmentSubmission{CitizenID: "0000000000001", Fullname: "QA Synthetic", Gender: "ชาย", Age: 45, AnswersA: tc.AnswersA, AnswersB: tc.AnswersB, Symptoms: tc.Symptoms}
			body, _ := json.Marshal(sub)
			req := httptest.NewRequest("POST", "/api/assessments", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != 201 {
				t.Fatalf("create: %d %s", w.Code, w.Body)
			}
			var saved models.AssessmentRecord
			if err := json.Unmarshal(w.Body.Bytes(), &saved); err != nil {
				t.Fatal(err)
			}
			if saved.TotalScore != tc.TotalScore || saved.RiskLevel != tc.RiskLevel || len(saved.AnswersA) != 9 || len(saved.AnswersB) != 6 || saved.CholinesteraseResult != "" {
				t.Fatalf("create mismatch: %+v", saved)
			}
			w = httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/api/assessments/"+saved.ID, nil))
			var read models.AssessmentRecord
			json.Unmarshal(w.Body.Bytes(), &read)
			if read.TotalScore != tc.TotalScore || read.RiskLevel != tc.RiskLevel || len(read.AnswersA) != 9 || len(read.AnswersB) != 6 {
				t.Fatalf("read mismatch: %+v", read)
			}
			var answers string
			if err := db.QueryRow("SELECT answers_a FROM assessments WHERE id=?", saved.ID).Scan(&answers); err != nil {
				t.Fatal(err)
			}
			var persisted map[string]int
			json.Unmarshal([]byte(answers), &persisted)
			for k, v := range tc.AnswersA {
				if persisted[k] != v {
					t.Fatalf("DB %s expected %d actual %d", k, v, persisted[k])
				}
			}
			t.Logf("POST -> SQLite -> GET: expected/actual score %d/%d level %s/%s PASS", tc.TotalScore, read.TotalScore, tc.RiskLevel, read.RiskLevel)
		})
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/api/stats/dashboard", nil))
	var stats models.DashboardStats
	json.Unmarshal(w.Body.Bytes(), &stats)
	if stats.TotalFarmers != len(cases) || stats.TestedBlood != 0 {
		t.Fatalf("dashboard: %+v", stats)
	}
	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/api/assessments", nil))
	var rows []models.AssessmentRecord
	json.Unmarshal(w.Body.Bytes(), &rows)
	if len(rows) != len(cases) || len(rows[0].AnswersA) != 9 {
		t.Fatalf("registry roundtrip mismatch")
	}
}

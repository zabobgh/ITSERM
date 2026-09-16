package models

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"
)

// Expected matrix is the repository's documented contract, not proof of a medical standard.
func TestRiskBoundaries(t *testing.T) {
	raw, err := os.ReadFile("../../qa/risk-cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []AssessmentRecord
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatal(err)
	}
	for _, tc := range cases {
		t.Run(tc.ID, func(t *testing.T) {
			a, b, total, group, level, blood := CalculateRiskMatrix(tc.AnswersA, tc.AnswersB, tc.Symptoms)
			if a != tc.ScoreA || b != tc.ScoreB || total != tc.TotalScore || group != tc.HighestSymptomGroup || level != tc.RiskLevel || blood != tc.RequireBloodTest {
				t.Fatalf("expected score=%d level=%s group=%d; actual A=%d B=%d total=%d group=%d level=%s blood=%v", tc.TotalScore, tc.RiskLevel, tc.HighestSymptomGroup, a, b, total, group, level, blood)
			}
			t.Logf("Input A=%v B=%v symptoms=%v | Expected/Actual score=%d/%d level=%s/%s | PASS", tc.AnswersA, tc.AnswersB, tc.Symptoms, tc.TotalScore, total, tc.RiskLevel, level)
		})
	}
}

func TestValidateScoredAnswers(t *testing.T) {
	a, b := map[string]int{}, map[string]int{}
	for q := 9; q <= 23; q++ {
		if q <= 17 {
			a[fmt.Sprintf("q%d", q)] = 1
		} else {
			b[fmt.Sprintf("q%d", q)] = 1
		}
	}
	if err := ValidateScoredAnswers(a, b); err != nil {
		t.Fatal(err)
	}
	for _, value := range []int{-1, 0, 4, 100} {
		a["q9"] = value
		if err := ValidateScoredAnswers(a, b); err == nil {
			t.Fatalf("accepted score %d", value)
		}
	}
	a["q9"] = 1
	delete(a, "q11")
	if err := ValidateScoredAnswers(a, b); err == nil {
		t.Fatal("accepted missing conditional answer")
	}
}

func TestEverySymptomAndHighestGroup(t *testing.T) {
	groups := []map[string]bool{SymptomsGroup1, SymptomsGroup2, SymptomsGroup3}
	for i, group := range groups {
		for symptom := range group {
			t.Run(symptom, func(t *testing.T) {
				_, _, _, actual, _, _ := CalculateRiskMatrix(map[string]int{"q9": 9}, map[string]int{"q18": 6}, []string{symptom})
				if actual != i+1 {
					t.Fatalf("expected group %d actual %d", i+1, actual)
				}
			})
		}
	}
	_, _, _, group, _, _ := CalculateRiskMatrix(nil, nil, []string{"มือสั่น", "ไอ", "อ่อนเพลีย"})
	if group != 3 {
		t.Fatal("highest symptom group was overwritten")
	}
}

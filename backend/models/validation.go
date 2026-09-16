package models

import "fmt"

// ValidateScoredAnswers checks the existing 15-question, 1..3 score contract.
// It does not infer or modify any answer.
func ValidateScoredAnswers(a, b map[string]int) error {
	if len(a) != 9 || len(b) != 6 {
		return fmt.Errorf("กรุณาตอบคำถามพฤติกรรมให้ครบ 15 ข้อ")
	}
	for q := 9; q <= 23; q++ {
		answers := a
		if q >= 18 {
			answers = b
		}
		value, ok := answers[fmt.Sprintf("q%d", q)]
		if !ok || value < 1 || value > 3 {
			return fmt.Errorf("คะแนนข้อ %d ต้องอยู่ระหว่าง 1 ถึง 3", q)
		}
	}
	return nil
}

package models

// FollowUpRecord represents a patient/farmer follow-up log entry
type FollowUpRecord struct {
	ID                string `json:"id"`
	CitizenID         string `json:"citizen_id" binding:"required"`
	AssessmentID      string `json:"assessment_id,omitempty"`
	FollowUpDate      string `json:"follow_up_date" binding:"required"`
	ResponsiblePerson string `json:"responsible_person" binding:"required"`
	FollowUpType      string `json:"follow_up_type" binding:"required"`
	Result            string `json:"result" binding:"required"`
	Notes             string `json:"notes"`
	CreatedAt         string `json:"created_at,omitempty"`
}

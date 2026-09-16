export interface FollowUpRecord {
  id: string;
  citizen_id: string;
  assessment_id?: string;
  follow_up_date: string;
  responsible_person: string;
  follow_up_type: 'นัดตรวจเลือดซ้ำ 2-4 สัปดาห์' | 'ติดตามการสวมใส่อุปกรณ์ PPE' | 'ส่งต่อพบแพทย์ รพ.' | 'ติดตามอาการพิษเฉียบพลัน' | 'อื่นๆ';
  result: 'ปกติ/ปลอดภัยแล้ว' | 'ยังมีความเสี่ยง/รอผลตรวจ' | 'ส่งต่อเรียบร้อยแล้ว' | 'ไม่สามารถติดต่อได้';
  notes: string;
  created_at: string;
}

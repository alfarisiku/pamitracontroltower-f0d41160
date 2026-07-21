
DELETE FROM public.activity_logs WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.addendums WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.finance_entries WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.manpower_logs WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.milestones WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.notifications WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.procurement_items WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.project_alerts WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.project_photos WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.purchase_orders WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.s_curve_data WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.user_project_assignments WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.weekly_progress_reports WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));
DELETE FROM public.work_areas WHERE project_id IN (SELECT id FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003'));

DELETE FROM public.projects WHERE project_code NOT IN ('PMT-001','PMT-002','PMT-003');

UPDATE public.projects SET
  name = 'Terminal Terpadu Palaran',
  client = 'PT Pertamina Patra Niaga',
  location = 'Palaran, Kota Samarinda, Kalimantan Timur',
  description = 'Pembangunan Terminal Terpadu Palaran untuk memperkuat rantai distribusi BBM dan ketahanan energi wilayah Kalimantan Timur (Kick-Off Meeting Maret 2026).',
  manager = 'Andi Wijaya',
  category = 'Production I',
  phase = 'Production I',
  status = 'execution',
  map_x = -0.55,
  map_y = 117.16
WHERE project_code = 'PMT-001';

UPDATE public.projects SET
  name = 'Terminal LPG Kolaka',
  client = 'PT Pertamina Patra Niaga',
  location = 'Kabupaten Kolaka, Sulawesi Tenggara',
  description = 'Proyek strategis pembangunan Terminal LPG Kolaka untuk memperkuat infrastruktur penyimpanan energi nasional dan ketahanan energi Sulawesi Tenggara. Fase lanjutan konstruksi 2026.',
  manager = 'Budi Santoso',
  category = 'Production II',
  phase = 'Production II',
  status = 'execution',
  progress = 42,
  budget = 18500000,
  spent = 7400000,
  contract_value = 21000000,
  rap = 18500000,
  profit_margin_target = 12,
  tkdn_percentage = 55,
  start_date = '2025-08-01',
  end_date = '2027-03-31',
  map_x = -4.05,
  map_y = 121.60,
  video_url = NULL,
  cctv_url = NULL
WHERE project_code = 'PMT-002';

UPDATE public.projects SET
  name = 'Jetty Integrated Terminal Manggis Bali',
  client = 'PT Pertamina Patra Niaga',
  location = 'Manggis, Karangasem, Bali',
  description = 'Pembangunan Jetty (marine facility) Integrated Terminal Manggis untuk mendukung keandalan pasokan BBM dan LPG di Bali serta Nusa Tenggara.',
  manager = 'Dewi Lestari',
  category = 'Production III',
  phase = 'Production III',
  status = 'on-hold',
  progress = 24,
  budget = 12800000,
  spent = 2950000,
  contract_value = 14500000,
  rap = 12800000,
  profit_margin_target = 11,
  tkdn_percentage = 48,
  start_date = '2025-10-01',
  end_date = '2027-06-30',
  map_x = -8.53,
  map_y = 115.51,
  video_url = NULL,
  cctv_url = NULL
WHERE project_code = 'PMT-003';

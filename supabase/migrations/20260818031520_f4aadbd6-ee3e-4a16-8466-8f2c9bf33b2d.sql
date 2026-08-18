UPDATE work_items wi
SET start_date = COALESCE(wi.start_date, p.start_date),
    end_date = COALESCE(wi.end_date, LEAST(p.end_date, (p.start_date + ((p.end_date - p.start_date) / 3))))
FROM work_areas wa JOIN projects p ON p.id = wa.project_id
WHERE wa.id = wi.work_area_id AND (wi.start_date IS NULL OR wi.end_date IS NULL);
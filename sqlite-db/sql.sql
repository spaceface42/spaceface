// LISTEN

SELECT
    p.id AS project_id,
    p.slug,
    p.title,
    p.year,
    p.client,
    p.published_at,
    (SELECT pf.file_path
     FROM project_files pf
     WHERE pf.project_id = p.id AND pf.role = 'cover'
     LIMIT 1) AS cover_image
FROM projects p
ORDER BY p.published_at DESC, p.id;




// proj

SELECT
    p.id AS project_id,
    p.slug,
    p.title,
    p.description,
    p.year,
    p.client,
    p.published_at,
    GROUP_CONCAT(pf.file_path || '|' || pf.role || '|' || pf.caption, '||') AS images
FROM projects p
LEFT JOIN project_files pf ON pf.project_id = p.id
WHERE p.id = 2
GROUP BY p.id;

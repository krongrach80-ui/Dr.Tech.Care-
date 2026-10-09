-- supabase/seed.sql
-- Dr.Tech.Care: Initial Seed Data for Development & Testing

-- 1. Create Default Director, Physio, and Patient in auth.users and profiles
do $$
declare
  director_id uuid := '00000000-0000-0000-0000-000000000001';
  physio_id uuid := '00000000-0000-0000-0000-000000000002';
  patient_id uuid := '00000000-0000-0000-0000-000000000003';
  quiz_set_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  -- Seed auth.users if auth schema is accessible
  if exists (select 1 from information_schema.schemata where schema_name = 'auth') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at)
    values
      (director_id, '00000000-0000-0000-0000-000000000000', 'director@drtechcare.local', crypt('Director1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"director"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      (physio_id, '00000000-0000-0000-0000-000000000000', 'physio@drtechcare.local', crypt('Physio1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"physio"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
      (patient_id, '00000000-0000-0000-0000-000000000000', 'patient@drtechcare.local', crypt('Patient1234!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"patient"}'::jsonb, 'authenticated', 'authenticated', now(), now())
    on conflict (id) do nothing;
  end if;

  -- Seed public.profiles
  insert into public.profiles (id, role, username, display_name, status)
  values
    (director_id, 'director', 'director.admin', 'นพ. วิทยา ผู้บริหารโรงพยาบาล', 'active'),
    (physio_id, 'physio', 'physio.somchai', 'กภ. สมชาย ใจดี', 'active'),
    (patient_id, 'patient', 'patient.sompong', 'นาย สมพงษ์ สุขใจ', 'active')
  on conflict (id) do nothing;

  -- Seed physiotherapists & patients details
  insert into public.physiotherapists (profile_id, first_name, last_name, phone, license_no)
  values
    (physio_id, 'สมชาย', 'ใจดี', '0812345678', 'PT-2567-001')
  on conflict (profile_id) do nothing;

  insert into public.patients (profile_id, first_name, last_name, birth_date, sex, phone, responsible_physio_id, onboarding_status, created_via)
  values
    (patient_id, 'สมพงษ์', 'สุขใจ', '1960-05-15', 'male', '0898765432', physio_id, 'active', 'staff')
  on conflict (profile_id) do nothing;

  -- 2. Seed 8 Standard Physical Therapy Exercises
  insert into public.exercises (id, name, summary, steps, target_muscles, suitable_for, recovery_phase, default_sets, default_reps, hold_seconds, difficulty, created_by)
  values
    (
      '20000000-0000-0000-0000-000000000001',
      'กางแขนขึ้นลง (Shoulder Abduction)',
      'บริหารกล้ามเนื้อหัวไหล่ เพิ่มมุมการเคลื่อนไหวและลดอาการไหล่ติด',
      array['ยืนหรือนั่งตัวตรง แขนแนบลำตัว', 'ค่อยๆ กางแขนออกด้านข้างจนถึงระดับหัวไหล่ (90 องศา)', 'ค้างไว้ 2 วินาที แล้วค่อยๆ ผ่อนแขนลง'],
      array['Deltoid', 'Supraspinatus', 'Trapezius'],
      'ผู้ป่วยข้อไหล่ติด หรือกล้ามเนื้อสะบักอ่อนแรง',
      'subacute', 3, 10, 2, 2, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000002',
      'เตะเหยียดเข่าบนเก้าอี้ (Seated Knee Extension)',
      'เสริมสร้างกล้ามเนื้อต้นขาด้านหน้า (Quadriceps) เพื่อพยุงข้อเข่า',
      array['นั่งบนเก้าอี้ หลังพิงพนัก เท้าแตะพื้น', 'ค่อยๆ เตะปลายขาเหยียดตรงไปข้างหน้าจนสุด', 'เกร็งกล้ามเนื้อต้นขาค้างไว้ 3 วินาที แล้วผ่อนลง'],
      array['Quadriceps', 'Vastus Medialis'],
      'ผู้ป่วยข้อเข่าเสื่อม หรือกล้ามเนื้อต้นขาอ่อนแรง',
      'any', 3, 12, 3, 1, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000003',
      'งอและเหยียดข้อศอก (Elbow Flexion & Extension)',
      'ฟื้นฟูกำลังแขนส่วนบนและข้อศอก',
      array['นั่งหรือยืนตัวตรง แขนแนบลำตัว หงายฝ่ามือขึ้น', 'งอข้อศอกยกมือขึ้นแตะหัวไหล่', 'เหยียดแขนลงสู่ตำแหน่งเดิมช้าๆ'],
      array['Biceps Brachii', 'Brachialis'],
      'ผู้ป่วยหลังถอดเฝือกแขน หรือผู้สูงอายุฝึกความคล่องตัว',
      'any', 3, 10, 1, 1, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000004',
      'ลุกนั่งจากเก้าอี้ (Sit to Stand)',
      'ฝึกกำลังขาและการทรงตัว เพื่อป้องกันการหกล้มในชีวิตประจำวัน',
      array['นั่งบนเก้าอี้มั่นคง เท้าวางราบ กอดอกไว้ที่หน้าอก', 'โน้มตัวไปข้างหน้าเล็กน้อยแล้วดันตัวลุกขึ้นยืนตรง', 'ค่อยๆ ย่อตัวหย่อนสะโพกลงนั่งบนเก้าอี้ช้าๆ'],
      array['Gluteus Maximus', 'Quadriceps', 'Hamstrings'],
      'ผู้สูงอายุฝึกการทรงตัว และฟื้นฟูหลังผ่าตัดสะโพก/เข่า',
      'subacute', 3, 8, 2, 3, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000005',
      'กระดกข้อเท้าขึ้นลง (Ankle Dorsiflexion)',
      'กระตุ้นการไหลเวียนโลหิตและเพิ่มความแข็งแรงของกล้ามเนื้อหน้าแข้ง',
      array['นั่งบนเก้าอี้ ส้นเท้าวางบนพื้น', 'กระดกปลายเท้าขึ้นให้สูงที่สุดเท่าที่จะทำได้', 'ค้างไว้ 3 วินาที แล้ววางปลายเท้าลง'],
      array['Tibialis Anterior', 'Gastrocnemius'],
      'ผู้ป่วยปลายประสาทเสื่อม หรือป้องกันภาวะลิ่มเลือดอุดตัน',
      'any', 3, 15, 3, 1, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000006',
      'วิดกำแพงปรับสมดุล (Wall Push-Up)',
      'เสริมสร้างกล้ามเนื้ออก ไหล่ และแกนกลางลำตัว แบบลดแรงกระแทก',
      array['ยืนห่างจากกำแพงประมาณหนึ่งช่วงแขน วางฝ่ามือเสมอไหล่', 'ค่อยๆ งอข้อศอก โน้มตัวเข้าหากำแพง ลำตัวตรง', 'ออกแรงดันฝ่ามือ ผลักตัวกลับสู่ตำแหน่งเริ่มต้น'],
      array['Pectoralis Major', 'Triceps', 'Core'],
      'ผู้เริ่มต้นออกกำลังกาย หรือผู้สูงอายุที่ข้อต่อรับน้ำหนักพื้นไม่ไหว',
      'subacute', 3, 10, 1, 2, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000007',
      'เอียงคอบริหารกล้ามเนื้อคอ (Neck Lateral Flexion)',
      'ยืดกล้ามเนื้อคอด้านข้างและคลายความตึงตัวรอบบ่า',
      array['นั่งตัวตรง ผ่อนคลายหัวไหล่ทั้งสองข้าง', 'ค่อยๆ เอียงศีรษะให้ใบหูเข้าหาหัวไหล่ข้างหนึ่ง', 'ค้างไว้ 5 วินาที แล้วสลับไปอีกข้าง'],
      array['Upper Trapezius', 'Sternocleidomastoid'],
      'ผู้ป่วยปวดคอบ่าเรื้อรัง ออฟฟิศซินโดรม',
      'any', 2, 5, 5, 1, director_id
    ),
    (
      '20000000-0000-0000-0000-000000000008',
      'บิดลำตัวบนเก้าอี้ (Seated Trunk Rotation)',
      'เพิ่มความยืดหยุ่นของแนวกระดูกสันหลังและกระตุ้นกล้ามเนื้อลำตัว',
      array['นั่งตัวตรง วางมือทั้งสองประสานกันที่หน้าอก', 'หมุนลำตัวช่วงบนไปทางซ้ายช้าๆ โดยสะโพกนิ่งอยู่กับที่', 'ค้างไว้ 3 วินาที แล้วหมุนกลับ สลับไปทางขวา'],
      array['Internal Oblique', 'External Oblique', 'Erector Spinae'],
      'ผู้สูงอายุเพิ่มความยืดหยุ่นในการเอี้ยวตัว',
      'any', 2, 8, 3, 2, director_id
    )
  on conflict (id) do nothing;

  -- 3. Seed Quiz Set
  insert into public.quiz_sets (id, title, description, category, difficulty, answer_mode, created_by)
  values
    (
      quiz_set_id,
      'แบบฝึกทักษะสมองและความจำประจำวัน (Daily Brain Training)',
      'ชุดคำถามฝึกทักษะความจำ การสังเกต และการคิดคำนวณเบื้องต้นสำหรับผู้สูงอายุ',
      'memory', 1, 'touch', director_id
    )
  on conflict (id) do nothing;

  -- 4. Seed 30 Brain Training Questions
  insert into public.quiz_questions (quiz_set_id, position, prompt, choices, correct_index, explanation, time_limit_seconds, created_by)
  values
    (quiz_set_id, 1, 'ผลไม้อะไรมีสีเหลืองและลิงชอบกิน?', '["แอปเปิ้ล", "กล้วย", "แตงโม", "ส้ม"]'::jsonb, 1, 'กล้วยมีเปลือกสีเหลืองและเป็นอาหารโปรดของลิง', 30, director_id),
    (quiz_set_id, 2, 'หนึ่งสัปดาห์มีกี่วัน?', '["5 วัน", "6 วัน", "7 วัน", "8 วัน"]'::jsonb, 2, 'หนึ่งสัปดาห์มี 7 วัน (จันทร์ถึงอาทิตย์)', 30, director_id),
    (quiz_set_id, 3, 'ข้อใดคือสัตว์ที่เห่าได้และเลี้ยงไว้เฝ้าบ้าน?', '["แมว", "สุนัข", "กระต่าย", "นก"]'::jsonb, 1, 'สุนัขเห่าได้และเป็นสัตว์เลี้ยงเฝ้าบ้านยอดนิยม', 30, director_id),
    (quiz_set_id, 4, '15 บวกกับ 5 ได้ผลลัพธ์เท่าใด?', '["18", "20", "22", "25"]'::jsonb, 1, '15 + 5 = 20', 30, director_id),
    (quiz_set_id, 5, 'สัญญาณไฟจราจรสีแดงหมายถึงอะไร?', '["หยุดรถ", "เตรียมไป", "ขับเร็วขึ้น", "เลี้ยวซ้าย"]'::jsonb, 0, 'ไฟสีแดงหมายถึงให้หยุดรถ', 30, director_id),
    (quiz_set_id, 6, 'ประเทศไทยอยู่ในทวีปใด?', '["ยุโรป", "แอฟริกา", "เอเชีย", "อเมริกา"]'::jsonb, 2, 'ประเทศไทยตั้งอยู่ในทวีปเอเชียตะวันออกเฉียงใต้', 30, director_id),
    (quiz_set_id, 7, 'ข้อใดคืออวัยวะที่ใช้ในการมองเห็น?', '["หู", "จมูก", "ตา", "ลิ้น"]'::jsonb, 2, 'ดวงตาทำหน้าที่ในการมองเห็น', 30, director_id),
    (quiz_set_id, 8, 'เวลาเช้า ดวงอาทิตย์ขึ้นทางทิศใด?', '["ทิศตะวันออก", "ทิศตะวันตก", "ทิศเหนือ", "ทิศใต้"]'::jsonb, 0, 'ดวงอาทิตย์ขึ้นทางทิศตะวันออกเสมอ', 30, director_id),
    (quiz_set_id, 9, 'ข้าวสารก่อนจะรับประทานต้องนำไปทำอะไรก่อน?', '["หุงหรือต้ม", "แช่เย็น", "ตากแดด", "บดละเอียด"]'::jsonb, 0, 'ข้าวสารต้องนำไปหุงให้สุกก่อนรับประทาน', 30, director_id),
    (quiz_set_id, 10, 'ตัวเลขใดมีค่ามากที่สุดในกลุ่มนี้?', '["45", "78", "23", "61"]'::jsonb, 1, '78 มีค่ามากที่สุดในกลุ่มตัวเลขนี้', 30, director_id),
    (quiz_set_id, 11, 'ช้อน มักจะใช้คู่กับอะไรในการรับประทานอาหาร?', '["มีด", "ส้อม", "แก้ว", "จาน"]'::jsonb, 1, 'ช้อนใช้คู่กับส้อม', 30, director_id),
    (quiz_set_id, 12, '10 ลบ 4 เหลือเท่าใด?', '["5", "6", "7", "8"]'::jsonb, 1, '10 - 4 = 6', 30, director_id),
    (quiz_set_id, 13, 'สัตว์ชนิดใดว่ายน้ำและหายใจด้วยเหงือก?', '["ม้า", "ปลา", "ไก่", "ช้าง"]'::jsonb, 1, 'ปลาอาศัยอยู่ในน้ำและมีเหงือก', 30, director_id),
    (quiz_set_id, 14, 'วันสงกรานต์ของไทยตรงกับเดือนใด?', '["มกราคม", "เมษายน", "สิงหาคม", "ธันวาคม"]'::jsonb, 1, 'วันสงกรานต์ตรงกับเดือนเมษายน (13-15 เมษายน)', 30, director_id),
    (quiz_set_id, 15, 'สิ่งใดใช้สำหรับแปรงฟัน?', '["ยาสีฟัน", "แชมพู", "สบู่เหลว", "น้ำยาล้างจาน"]'::jsonb, 0, 'ยาสีฟันใช้ทำความสะอาดฟันร่วมกับแปรงสีฟัน', 30, director_id),
    (quiz_set_id, 16, 'ถ้าวันนี้เป็นวันพุธ พรุ่งนี้จะเป็นวันอะไร?', '["วันอังคาร", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"]'::jsonb, 1, 'วันถัดจากวันพุธคือวันพฤหัสบดี', 30, director_id),
    (quiz_set_id, 17, 'เงินเหรียญสิบบาทมีค่าเท่ากับเหรียญห้าบาทกี่เหรียญ?', '["1 เหรียญ", "2 เหรียญ", "3 เหรียญ", "4 เหรียญ"]'::jsonb, 1, '5 + 5 = 10 บาท ดังนั้นเท่ากับ 2 เหรียญ', 30, director_id),
    (quiz_set_id, 18, 'ยานพาหนะใดแล่นบนรางรถไฟ?', '["รถเก๋ง", "รถไฟ", "เรือพาย", "เครื่องบิน"]'::jsonb, 1, 'รถไฟวิ่งบนรางเหล็ก', 30, director_id),
    (quiz_set_id, 19, 'เสื้อผ้าเมื่อซักเสร็จเปียกน้ำ ควรทำอย่างไรให้แห้ง?', '["นำไปตากแดดหรือผึ่งลม", "ใส่ในตู้เย็น", "ใส่ตู้เสื้อผ้าทันที", "แช่น้ำต่อ"]'::jsonb, 0, 'การตากแดดหรือผึ่งลมช่วยระเหยน้ำทำให้ผ้าแห้ง', 30, director_id),
    (quiz_set_id, 20, '2 คูณ 5 ได้ผลลัพธ์เท่าใด?', '["7", "10", "12", "15"]'::jsonb, 1, '2 × 5 = 10', 30, director_id),
    (quiz_set_id, 21, 'ข้อใดคือเครื่องดื่มที่มีประโยชน์ต่อกระดูกและฟัน?', '["น้ำอัดลม", "นมสด", "น้ำหวานเข้มข้น", "สุรา"]'::jsonb, 1, 'นมสดอุดมด้วยแคลเซียมช่วยบำรุงกระดูกและฟัน', 30, director_id),
    (quiz_set_id, 22, 'สิ่งของใดใช้ดูเวลา?', '["แว่นตา", "นาฬิกา", "กระจก", "กล้องส่องทางไกล"]'::jsonb, 1, 'นาฬิกาบอกชั่วโมงและนาที', 30, director_id),
    (quiz_set_id, 23, 'แม่ของแม่ เราเรียกว่าอะไร?', '["คุณย่า", "คุณยาย", "คุณป้า", "คุณน้า"]'::jsonb, 1, 'แม่ของแม่คือคุณยาย (แม่ของพ่อคือคุณย่า)', 30, director_id),
    (quiz_set_id, 24, 'ข้อใดคือสีของใบไม้ส่วนใหญ่ในธรรมชาติ?', '["สีแดง", "สีเขียว", "สีม่วง", "สีส้ม"]'::jsonb, 1, 'คลอโรฟิลล์ในพืชทำให้ใบไม้มีสีเขียว', 30, director_id),
    (quiz_set_id, 25, '30 ลบ 10 เหลือเท่าใด?', '["15", "20", "25", "30"]'::jsonb, 1, '30 - 10 = 20', 30, director_id),
    (quiz_set_id, 26, 'เมื่อรู้สึกกระหายน้ำ สิ่งที่ดีที่สุดในการดื่มคืออะไร?', '["น้ำเปล่าสะอาด", "น้ำหวานจัด", "กาแฟดำเข้ม", "น้ำเชื่อม"]'::jsonb, 0, 'น้ำเปล่าสะอาดให้ความชุ่มชื้นแก่ร่างกายได้ดีที่สุด', 30, director_id),
    (quiz_set_id, 27, 'สัตว์ชนิดใดขันปลุกตอนเช้า?', '["เป็ด", "ไก่ตัวผู้", "นกฮูก", "หมู"]'::jsonb, 1, 'ไก่ตัวผู้มักจะขันตอนเช้าตรู่', 30, director_id),
    (quiz_set_id, 28, 'ของใช้ใดช่วยป้องกันฝนตกหรือแดดจ้าขณะเดินกลางแจ้ง?', '["หมอน", "ร่ม", "ผ้าห่ม", "พรมเช็ดเท้า"]'::jsonb, 1, 'ร่มใช้กางกันฝนและกันแดด', 30, director_id),
    (quiz_set_id, 29, '5 บวก 5 บวก 5 ได้เท่าใด?', '["10", "15", "20", "25"]'::jsonb, 1, '5 + 5 + 5 = 15', 30, director_id),
    (quiz_set_id, 30, 'ก่อนนอนและหลังตื่นนอน เราควรทำสิ่งใดกับฟัน?', '["แปรงฟัน", "เคี้ยวหมากฝรั่ง", "ดื่มน้ำอัดลม", "ไม่ต้องทำอะไร"]'::jsonb, 0, 'การแปรงฟันช่วยป้องกันฟันผุและรักษาสุขภาพช่องปาก', 30, director_id)
  on conflict do nothing;

  -- 5. Seed an active schedule entry for today for testing daily checklist flow
  insert into public.schedule_entries (
    patient_id,
    scheduled_date,
    exercise_id,
    quiz_set_id,
    target_sets,
    target_reps,
    status,
    created_by
  )
  values (
    patient_id,
    current_date,
    '20000000-0000-0000-0000-000000000001',
    quiz_set_id,
    3,
    10,
    'planned',
    physio_id
  )
  on conflict do nothing;

end $$;

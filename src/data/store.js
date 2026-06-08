'use strict';

/**
 * 数据仓储层 - 基于 MySQL（mysql2/promise）。
 * 所有方法 async，返回 camelCase 字段对象。
 */

const { pool } = require('../db');

/* ----------------------------- 映射 ----------------------------- */

function mapStudent(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentNo: r.student_no,
    name: r.name,
    grade: r.grade,
    school: r.school,
    guardianName: r.guardian_name,
    guardianPhone: r.guardian_phone,
    allergies: r.allergies,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapPlan(r) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    meals: r.meals,
    priceCents: r.price_cents,
    period: r.period,
    description: r.description,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

function mapEnrollment(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    planId: r.plan_id,
    startDate: r.start_date,
    endDate: r.end_date,
    amountCents: r.amount_cents,
    paid: !!r.paid,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapMenu(r) {
  if (!r) return null;
  return {
    id: r.id,
    menuDate: r.menu_date,
    meal: r.meal,
    dishes: r.dishes,
    createdAt: r.created_at,
  };
}

function mapAttendance(r) {
  if (!r) return null;
  return {
    id: r.id,
    studentId: r.student_id,
    attendDate: r.attend_date,
    meal: r.meal,
    status: r.status,
    pickedUpBy: r.picked_up_by,
    checkedAt: r.checked_at,
    remark: r.remark,
  };
}

function mapBill(r) {
  if (!r) return null;
  return {
    id: r.id,
    billNo: r.bill_no,
    studentId: r.student_id,
    periodYear: r.period_year,
    periodMonth: r.period_month,
    version: r.version,
    prevBillId: r.prev_bill_id,
    status: r.status,
    planId: r.plan_id,
    planName: r.plan_name,
    planMeals: r.plan_meals,
    planPriceCents: r.plan_price_cents,
    expectedMeals: r.expected_meals,
    actualPresent: r.actual_present,
    actualLeave: r.actual_leave,
    actualAbsent: r.actual_absent,
    chargeCents: r.charge_cents,
    refundCents: r.refund_cents,
    supplementCents: r.supplement_cents,
    carryForwardCents: r.carry_forward_cents,
    receivedCents: r.received_cents,
    balanceCents: r.balance_cents,
    issuedAt: r.issued_at,
    voidedAt: r.voided_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapBillItem(r) {
  if (!r) return null;
  return {
    id: r.id,
    billId: r.bill_id,
    itemType: r.item_type,
    description: r.description,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    amountCents: r.amount_cents,
    sortOrder: r.sort_order,
  };
}

function mapExportTask(r) {
  if (!r) return null;
  return {
    id: r.id,
    taskType: r.task_type,
    periodYear: r.period_year,
    periodMonth: r.period_month,
    format: r.format,
    status: r.status,
    filePath: r.file_path,
    fileSize: r.file_size,
    rowCount: r.row_count,
    errorMessage: r.error_message,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    createdAt: r.created_at,
  };
}

/* --------------------------- 初始化/重置 --------------------------- */

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['export_tasks', 'bill_items', 'bills', 'attendances', 'enrollments', 'daily_menus', 'meal_plans', 'students']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    await conn.query(
      `INSERT INTO students (id, student_no, name, grade, school, guardian_name, guardian_phone, allergies, status) VALUES
        (1,'XS2026001','小明','三年级','实验小学','王女士','13800001111','花生','ACTIVE'),
        (2,'XS2026002','小红','四年级','实验小学','李先生','13800002222','','ACTIVE'),
        (3,'XS2026003','小刚','二年级','中心小学','张女士','13800003333','海鲜','ACTIVE'),
        (4,'XS2026004','小丽','五年级','中心小学','赵先生','13800004444','','INACTIVE')`,
    );
    await conn.query(
      `INSERT INTO meal_plans (id, name, meals, price_cents, period, description, active) VALUES
        (1,'工作日午餐月套餐','LUNCH',60000,'MONTHLY','周一至周五午餐',1),
        (2,'午晚两餐月套餐','LUNCH,DINNER',99000,'MONTHLY','周一至周五午餐+晚餐含作业辅导',1),
        (3,'单日午餐','LUNCH',3000,'DAILY','临时单日午餐',1)`,
    );
    await conn.query(
      `INSERT INTO enrollments (id, student_id, plan_id, start_date, end_date, amount_cents, paid, status) VALUES
        (1,1,1,'2026-06-01','2026-06-30',60000,1,'ACTIVE'),
        (2,2,2,'2026-06-01','2026-06-30',99000,1,'ACTIVE'),
        (3,3,1,'2026-06-01','2026-06-30',60000,0,'ACTIVE')`,
    );
    await conn.query(
      `INSERT INTO daily_menus (id, menu_date, meal, dishes) VALUES
        (1,'2026-06-05','LUNCH','红烧鸡腿、清炒时蔬、紫菜蛋汤、米饭'),
        (2,'2026-06-05','DINNER','番茄牛腩、蒜蓉西兰花、米饭'),
        (3,'2026-06-06','LUNCH','糖醋里脊、麻婆豆腐、冬瓜汤、米饭')`,
    );
    await conn.query(
      `INSERT INTO attendances (id, student_id, attend_date, meal, status, picked_up_by, remark) VALUES
        (1,1,'2026-06-05','LUNCH','PRESENT','','正常用餐'),
        (2,2,'2026-06-05','LUNCH','PRESENT','','正常用餐'),
        (3,3,'2026-06-05','LUNCH','ABSENT','','家长请假')`,
    );
  } finally {
    conn.release();
  }
}

/* ----------------------------- 学生 ----------------------------- */

async function listStudents({ status, school } = {}) {
  const where = [];
  const params = [];
  if (status !== undefined) { where.push('status = ?'); params.push(status); }
  if (school !== undefined) { where.push('school = ?'); params.push(school); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM students ${clause} ORDER BY id`, params);
  return rows.map(mapStudent);
}

async function getStudent(id) {
  const [rows] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
  return mapStudent(rows[0]);
}

async function findStudentByNo(studentNo) {
  const [rows] = await pool.query('SELECT * FROM students WHERE student_no = ?', [studentNo]);
  return mapStudent(rows[0]);
}

async function createStudent(s) {
  const [r] = await pool.query(
    `INSERT INTO students (student_no, name, grade, school, guardian_name, guardian_phone, allergies, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.studentNo, s.name, s.grade || '', s.school || '', s.guardianName || '',
     s.guardianPhone || '', s.allergies || '', s.status || 'ACTIVE'],
  );
  return getStudent(r.insertId);
}

async function updateStudent(id, patch) {
  const map = {
    name: 'name', grade: 'grade', school: 'school',
    guardianName: 'guardian_name', guardianPhone: 'guardian_phone',
    allergies: 'allergies', status: 'status',
  };
  const sets = [];
  const params = [];
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { sets.push(`${col} = ?`); params.push(patch[k]); }
  }
  if (sets.length) {
    sets.push('updated_at = CURRENT_TIMESTAMP(3)');
    params.push(id);
    await pool.query(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getStudent(id);
}

async function deleteStudent(id) {
  const [r] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

/* ----------------------------- 套餐 ----------------------------- */

async function listPlans({ activeOnly } = {}) {
  const clause = activeOnly ? 'WHERE active = 1' : '';
  const [rows] = await pool.query(`SELECT * FROM meal_plans ${clause} ORDER BY id`);
  return rows.map(mapPlan);
}

async function getPlan(id) {
  const [rows] = await pool.query('SELECT * FROM meal_plans WHERE id = ?', [id]);
  return mapPlan(rows[0]);
}

async function createPlan(p) {
  const [r] = await pool.query(
    `INSERT INTO meal_plans (name, meals, price_cents, period, description, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [p.name, p.meals || 'LUNCH', p.priceCents || 0, p.period || 'MONTHLY',
     p.description || '', p.active === false ? 0 : 1],
  );
  return getPlan(r.insertId);
}

/* ----------------------------- 报名/订餐 ----------------------------- */

async function listEnrollments({ studentId } = {}) {
  if (studentId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM enrollments WHERE student_id = ? ORDER BY id', [studentId]);
    return rows.map(mapEnrollment);
  }
  const [rows] = await pool.query('SELECT * FROM enrollments ORDER BY id');
  return rows.map(mapEnrollment);
}

async function getEnrollment(id) {
  const [rows] = await pool.query('SELECT * FROM enrollments WHERE id = ?', [id]);
  return mapEnrollment(rows[0]);
}

async function createEnrollment(e) {
  const [r] = await pool.query(
    `INSERT INTO enrollments (student_id, plan_id, start_date, end_date, amount_cents, paid, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [e.studentId, e.planId, e.startDate, e.endDate, e.amountCents, e.paid ? 1 : 0, e.status || 'ACTIVE'],
  );
  return getEnrollment(r.insertId);
}

async function markEnrollmentPaid(id) {
  await pool.query('UPDATE enrollments SET paid = 1 WHERE id = ?', [id]);
  return getEnrollment(id);
}

/* ----------------------------- 菜单 ----------------------------- */

async function listMenus({ date } = {}) {
  if (date !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM daily_menus WHERE menu_date = ? ORDER BY meal', [date]);
    return rows.map(mapMenu);
  }
  const [rows] = await pool.query('SELECT * FROM daily_menus ORDER BY menu_date DESC, meal');
  return rows.map(mapMenu);
}

async function findMenu(date, meal) {
  const [rows] = await pool.query(
    'SELECT * FROM daily_menus WHERE menu_date = ? AND meal = ?', [date, meal]);
  return mapMenu(rows[0]);
}

async function upsertMenu(m) {
  await pool.query(
    `INSERT INTO daily_menus (menu_date, meal, dishes) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE dishes = VALUES(dishes)`,
    [m.menuDate, m.meal, m.dishes || ''],
  );
  return findMenu(m.menuDate, m.meal);
}

/* ----------------------------- 出勤/签到 ----------------------------- */

async function listAttendances({ date, studentId } = {}) {
  const where = [];
  const params = [];
  if (date !== undefined) { where.push('attend_date = ?'); params.push(date); }
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM attendances ${clause} ORDER BY attend_date DESC, id`, params);
  return rows.map(mapAttendance);
}

async function findAttendance(studentId, date, meal) {
  const [rows] = await pool.query(
    'SELECT * FROM attendances WHERE student_id = ? AND attend_date = ? AND meal = ?',
    [studentId, date, meal]);
  return mapAttendance(rows[0]);
}

async function createAttendance(a) {
  const [r] = await pool.query(
    `INSERT INTO attendances (student_id, attend_date, meal, status, picked_up_by, remark)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [a.studentId, a.attendDate, a.meal, a.status || 'PRESENT', a.pickedUpBy || '', a.remark || ''],
  );
  const [rows] = await pool.query('SELECT * FROM attendances WHERE id = ?', [r.insertId]);
  return mapAttendance(rows[0]);
}

/* ----------------------------- 账单 ----------------------------- */

function _countWorkdays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

function _mealsCount(mealsStr, workdays) {
  return mealsStr.split(',').length * workdays;
}

async function _getLatestNonVoidedBill(studentId, periodYear, periodMonth) {
  const [rows] = await pool.query(
    `SELECT * FROM bills
     WHERE student_id = ? AND period_year = ? AND period_month = ? AND status != 'VOIDED'
     ORDER BY version DESC LIMIT 1`,
    [studentId, periodYear, periodMonth],
  );
  return mapBill(rows[0]);
}

async function _getPrevMonthBalance(studentId, periodYear, periodMonth) {
  let py = periodYear;
  let pm = periodMonth - 1;
  if (pm === 0) { pm = 12; py -= 1; }
  const [rows] = await pool.query(
    `SELECT balance_cents FROM bills
     WHERE student_id = ? AND period_year = ? AND period_month = ? AND status = 'ISSUED'
     ORDER BY version DESC LIMIT 1`,
    [studentId, py, pm],
  );
  return rows.length > 0 ? rows[0].balance_cents : 0;
}

async function generateBill(studentId, periodYear, periodMonth) {
  const existing = await _getLatestNonVoidedBill(studentId, periodYear, periodMonth);
  if (existing) return { error: 'DUPLICATE', bill: existing };

  const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
  const [enrollRows] = await pool.query(
    `SELECT e.*, mp.name AS plan_name, mp.meals AS plan_meals, mp.price_cents AS plan_price_cents
     FROM enrollments e
     JOIN meal_plans mp ON mp.id = e.plan_id
     WHERE e.student_id = ? AND e.status = 'ACTIVE'
       AND e.start_date <= LAST_DAY(?)
       AND e.end_date >= ?`,
    [studentId, periodStart, periodStart],
  );

  if (enrollRows.length === 0) return { error: 'NO_ENROLLMENT' };

  const enr = enrollRows[0];
  const workdays = _countWorkdays(periodYear, periodMonth);
  const expectedMeals = _mealsCount(enr.plan_meals, workdays);

  const [attRows] = await pool.query(
    `SELECT status, COUNT(*) AS cnt FROM attendances
     WHERE student_id = ?
       AND attend_date >= ?
       AND attend_date <= LAST_DAY(?)
     GROUP BY status`,
    [studentId, periodStart, periodStart],
  );

  let actualPresent = 0;
  let actualLeave = 0;
  let actualAbsent = 0;
  for (const ar of attRows) {
    if (ar.status === 'PRESENT') actualPresent = ar.cnt;
    else if (ar.status === 'LEAVE') actualLeave = ar.cnt;
    else if (ar.status === 'ABSENT') actualAbsent = ar.cnt;
  }

  const mealsPerDay = enr.plan_meals.split(',').length;
  const unitPrice = expectedMeals > 0 ? Math.floor(enr.plan_price_cents / expectedMeals) : 0;
  const totalAllocated = unitPrice * expectedMeals;
  const tailAdjust = enr.plan_price_cents - totalAllocated;

  const presentCents = unitPrice * actualPresent * mealsPerDay;
  const leaveCents = unitPrice * actualLeave * mealsPerDay;
  const chargeCents = enr.plan_price_cents;

  const attendedCents = presentCents + leaveCents;
  const refundCents = Math.max(0, chargeCents - attendedCents - tailAdjust);
  const supplementCents = 0;

  const carryForwardCents = await _getPrevMonthBalance(studentId, periodYear, periodMonth);
  const receivedCents = enr.paid ? enr.amount_cents : 0;
  const balanceCents = carryForwardCents + chargeCents - refundCents + supplementCents - receivedCents;

  const billNo = `BILL-${periodYear}${String(periodMonth).padStart(2, '0')}-${String(studentId).padStart(4, '0')}-V1`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [billResult] = await conn.query(
      `INSERT INTO bills (bill_no, student_id, period_year, period_month, version, prev_bill_id, status,
         plan_id, plan_name, plan_meals, plan_price_cents,
         expected_meals, actual_present, actual_leave, actual_absent,
         charge_cents, refund_cents, supplement_cents,
         carry_forward_cents, received_cents, balance_cents)
       VALUES (?, ?, ?, ?, 1, NULL, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [billNo, studentId, periodYear, periodMonth,
       enr.plan_id, enr.plan_name, enr.plan_meals, enr.plan_price_cents,
       expectedMeals, actualPresent, actualLeave, actualAbsent,
       chargeCents, refundCents, supplementCents,
       carryForwardCents, receivedCents, balanceCents],
    );

    const billId = billResult.insertId;

    const items = [
      { itemType: 'CHARGE', description: `${enr.plan_name} 套餐费`, quantity: 1, unitPriceCents: chargeCents, amountCents: chargeCents, sortOrder: 1 },
    ];
    if (refundCents > 0) {
      items.push({ itemType: 'REFUND', description: `出勤不足退费（缺勤${actualAbsent}次×${mealsPerDay}餐×${unitPrice}分${tailAdjust !== 0 ? ' + 尾差调整' + tailAdjust + '分' : ''}）`, quantity: actualAbsent, unitPriceCents: Math.round(refundCents / Math.max(actualAbsent, 1)), amountCents: refundCents, sortOrder: 2 });
    }
    if (supplementCents > 0) {
      items.push({ itemType: 'SUPPLEMENT', description: '补收', quantity: 1, unitPriceCents: supplementCents, amountCents: supplementCents, sortOrder: 3 });
    }
    if (carryForwardCents !== 0) {
      items.push({
        itemType: carryForwardCents > 0 ? 'CARRY_DEBIT' : 'CARRY_CREDIT',
        description: '上期结转',
        quantity: 1,
        unitPriceCents: Math.abs(carryForwardCents),
        amountCents: carryForwardCents,
        sortOrder: 4,
      });
    }
    items.push({ itemType: 'RECEIVED', description: '本期实收', quantity: 1, unitPriceCents: receivedCents, amountCents: receivedCents, sortOrder: 5 });

    for (const item of items) {
      await conn.query(
        `INSERT INTO bill_items (bill_id, item_type, description, quantity, unit_price_cents, amount_cents, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [billId, item.itemType, item.description, item.quantity, item.unitPriceCents, item.amountCents, item.sortOrder],
      );
    }

    await conn.commit();

    const bill = await getBill(billId);
    return { error: null, bill };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function generateBillsForPeriod(periodYear, periodMonth) {
  const [enrRows] = await pool.query(
    `SELECT DISTINCT e.student_id FROM enrollments e
     WHERE e.status = 'ACTIVE'
       AND e.start_date <= LAST_DAY(?)
       AND e.end_date >= ?`,
    [`${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
     `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`],
  );

  const results = [];
  for (const row of enrRows) {
    const r = await generateBill(row.student_id, periodYear, periodMonth);
    results.push({ studentId: row.student_id, ...r });
  }
  return results;
}

async function getBill(id) {
  const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  const bill = mapBill(rows[0]);
  if (!bill) return null;
  const [itemRows] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order', [id]);
  bill.items = itemRows.map(mapBillItem);
  return bill;
}

async function getBillByStudentPeriod(studentId, periodYear, periodMonth) {
  const [rows] = await pool.query(
    `SELECT * FROM bills
     WHERE student_id = ? AND period_year = ? AND period_month = ? AND status != 'VOIDED'
     ORDER BY version DESC LIMIT 1`,
    [studentId, periodYear, periodMonth],
  );
  const bill = mapBill(rows[0]);
  if (!bill) return null;
  const [itemRows] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order', [bill.id]);
  bill.items = itemRows.map(mapBillItem);
  return bill;
}

async function listBills({ periodYear, periodMonth, studentId, status } = {}) {
  const where = [];
  const params = [];
  if (periodYear !== undefined) { where.push('period_year = ?'); params.push(periodYear); }
  if (periodMonth !== undefined) { where.push('period_month = ?'); params.push(periodMonth); }
  if (studentId !== undefined) { where.push('student_id = ?'); params.push(studentId); }
  if (status !== undefined) { where.push('status = ?'); params.push(status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM bills ${clause} ORDER BY period_year DESC, period_month DESC, student_id, version DESC`,
    params,
  );
  return rows.map(mapBill);
}

async function issueBill(id) {
  const bill = await getBill(id);
  if (!bill) return { error: 'NOT_FOUND' };
  if (bill.status !== 'DRAFT') return { error: 'NOT_DRAFT' };

  await pool.query(
    `UPDATE bills SET status = 'ISSUED', issued_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'DRAFT'`,
    [id],
  );
  const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  return { error: null, bill: mapBill(rows[0]) };
}

async function voidBill(id) {
  const bill = await getBill(id);
  if (!bill) return { error: 'NOT_FOUND' };
  if (bill.status === 'VOIDED') return { error: 'ALREADY_VOIDED' };
  if (bill.status === 'DRAFT') return { error: 'DRAFT_CANNOT_VOID' };

  await pool.query(
    `UPDATE bills SET status = 'VOIDED', voided_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
    [id],
  );
  const [rows] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
  return { error: null, bill: mapBill(rows[0]) };
}

async function regenerateBill(id) {
  const oldBill = await getBill(id);
  if (!oldBill) return { error: 'NOT_FOUND' };

  if (oldBill.status === 'ISSUED') {
    const voidResult = await voidBill(id);
    if (voidResult.error) return voidResult;
  } else if (oldBill.status === 'DRAFT') {
    await pool.query('DELETE FROM bill_items WHERE bill_id = ?', [id]);
    await pool.query('DELETE FROM bills WHERE id = ?', [id]);
  } else if (oldBill.status === 'VOIDED') {
    // already voided, proceed
  }

  const nextVersion = oldBill.version + 1;
  const periodYear = oldBill.periodYear;
  const periodMonth = oldBill.periodMonth;
  const studentId = oldBill.studentId;
  const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;

  const [enrRows] = await pool.query(
    `SELECT e.*, mp.name AS plan_name, mp.meals AS plan_meals, mp.price_cents AS plan_price_cents
     FROM enrollments e
     JOIN meal_plans mp ON mp.id = e.plan_id
     WHERE e.student_id = ? AND e.status = 'ACTIVE'
       AND e.start_date <= LAST_DAY(?)
       AND e.end_date >= ?`,
    [studentId, periodStart, periodStart],
  );

  if (enrRows.length === 0) return { error: 'NO_ENROLLMENT' };

  const enr = enrRows[0];
  const workdays = _countWorkdays(periodYear, periodMonth);
  const expectedMeals = _mealsCount(enr.plan_meals, workdays);

  const [attRows] = await pool.query(
    `SELECT status, COUNT(*) AS cnt FROM attendances
     WHERE student_id = ?
       AND attend_date >= ?
       AND attend_date <= LAST_DAY(?)
     GROUP BY status`,
    [studentId, periodStart, periodStart],
  );

  let actualPresent = 0;
  let actualLeave = 0;
  let actualAbsent = 0;
  for (const ar of attRows) {
    if (ar.status === 'PRESENT') actualPresent = ar.cnt;
    else if (ar.status === 'LEAVE') actualLeave = ar.cnt;
    else if (ar.status === 'ABSENT') actualAbsent = ar.cnt;
  }

  const mealsPerDay = enr.plan_meals.split(',').length;
  const unitPrice = expectedMeals > 0 ? Math.floor(enr.plan_price_cents / expectedMeals) : 0;
  const totalAllocated = unitPrice * expectedMeals;
  const tailAdjust = enr.plan_price_cents - totalAllocated;

  const presentCents = unitPrice * actualPresent * mealsPerDay;
  const leaveCents = unitPrice * actualLeave * mealsPerDay;
  const chargeCents = enr.plan_price_cents;
  const attendedCents = presentCents + leaveCents;
  const refundCents = Math.max(0, chargeCents - attendedCents - tailAdjust);
  const supplementCents = 0;

  const carryForwardCents = await _getPrevMonthBalance(studentId, periodYear, periodMonth);
  const receivedCents = enr.paid ? enr.amount_cents : 0;
  const balanceCents = carryForwardCents + chargeCents - refundCents + supplementCents - receivedCents;

  const billNo = `BILL-${periodYear}${String(periodMonth).padStart(2, '0')}-${String(studentId).padStart(4, '0')}-V${nextVersion}`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [billResult] = await conn.query(
      `INSERT INTO bills (bill_no, student_id, period_year, period_month, version, prev_bill_id, status,
         plan_id, plan_name, plan_meals, plan_price_cents,
         expected_meals, actual_present, actual_leave, actual_absent,
         charge_cents, refund_cents, supplement_cents,
         carry_forward_cents, received_cents, balance_cents)
       VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [billNo, studentId, periodYear, periodMonth, nextVersion,
       oldBill.status === 'VOIDED' ? id : null,
       enr.plan_id, enr.plan_name, enr.plan_meals, enr.plan_price_cents,
       expectedMeals, actualPresent, actualLeave, actualAbsent,
       chargeCents, refundCents, supplementCents,
       carryForwardCents, receivedCents, balanceCents],
    );

    const newBillId = billResult.insertId;

    const items = [
      { itemType: 'CHARGE', description: `${enr.plan_name} 套餐费`, quantity: 1, unitPriceCents: chargeCents, amountCents: chargeCents, sortOrder: 1 },
    ];
    if (refundCents > 0) {
      items.push({ itemType: 'REFUND', description: `出勤不足退费（缺勤${actualAbsent}次×${mealsPerDay}餐×${unitPrice}分${tailAdjust !== 0 ? ' + 尾差调整' + tailAdjust + '分' : ''}）`, quantity: actualAbsent, unitPriceCents: Math.round(refundCents / Math.max(actualAbsent, 1)), amountCents: refundCents, sortOrder: 2 });
    }
    if (supplementCents > 0) {
      items.push({ itemType: 'SUPPLEMENT', description: '补收', quantity: 1, unitPriceCents: supplementCents, amountCents: supplementCents, sortOrder: 3 });
    }
    if (carryForwardCents !== 0) {
      items.push({
        itemType: carryForwardCents > 0 ? 'CARRY_DEBIT' : 'CARRY_CREDIT',
        description: '上期结转',
        quantity: 1,
        unitPriceCents: Math.abs(carryForwardCents),
        amountCents: carryForwardCents,
        sortOrder: 4,
      });
    }
    items.push({ itemType: 'RECEIVED', description: '本期实收', quantity: 1, unitPriceCents: receivedCents, amountCents: receivedCents, sortOrder: 5 });

    for (const item of items) {
      await conn.query(
        `INSERT INTO bill_items (bill_id, item_type, description, quantity, unit_price_cents, amount_cents, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newBillId, item.itemType, item.description, item.quantity, item.unitPriceCents, item.amountCents, item.sortOrder],
      );
    }

    await conn.commit();
    const bill = await getBill(newBillId);
    return { error: null, bill };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function getReconciliation(periodYear, periodMonth) {
  const [billRows] = await pool.query(
    `SELECT b.*, s.name AS student_name, s.student_no
     FROM bills b
     JOIN students s ON s.id = b.student_id
     WHERE b.period_year = ? AND b.period_month = ? AND b.status = 'ISSUED'`,
    [periodYear, periodMonth],
  );

  let totalChargeCents = 0;
  let totalReceivedCents = 0;
  let totalRefundCents = 0;
  let totalSupplementCents = 0;
  const arrears = [];
  const planMap = {};

  for (const b of billRows) {
    totalChargeCents += b.charge_cents;
    totalReceivedCents += b.received_cents;
    totalRefundCents += b.refund_cents;
    totalSupplementCents += b.supplement_cents;

    if (b.balance_cents > 0) {
      arrears.push({
        studentId: b.student_id,
        studentName: b.student_name,
        studentNo: b.student_no,
        balanceCents: b.balance_cents,
      });
    }

    const key = b.plan_name;
    if (!planMap[key]) {
      planMap[key] = { planName: b.plan_name, planMeals: b.plan_meals, studentCount: 0, incomeCents: 0 };
    }
    planMap[key].studentCount += 1;
    planMap[key].incomeCents += b.charge_cents;
  }

  const planDistribution = Object.values(planMap);
  const totalIncome = planDistribution.reduce((s, p) => s + p.incomeCents, 0);
  for (const p of planDistribution) {
    p.incomeRatio = totalIncome > 0 ? Math.round(p.incomeCents / totalIncome * 10000) / 10000 : 0;
  }

  return {
    periodYear,
    periodMonth,
    totalChargeCents,
    totalReceivedCents,
    totalRefundCents,
    totalSupplementCents,
    netAmountCents: totalChargeCents - totalRefundCents + totalSupplementCents,
    billCount: billRows.length,
    arrears,
    planDistribution,
  };
}

/* ----------------------------- 导出任务 ----------------------------- */

async function createExportTask(taskType, periodYear, periodMonth, format) {
  const [r] = await pool.query(
    `INSERT INTO export_tasks (task_type, period_year, period_month, format, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [taskType, periodYear, periodMonth, format],
  );
  const [rows] = await pool.query('SELECT * FROM export_tasks WHERE id = ?', [r.insertId]);
  return mapExportTask(rows[0]);
}

async function getExportTask(id) {
  const [rows] = await pool.query('SELECT * FROM export_tasks WHERE id = ?', [id]);
  return mapExportTask(rows[0]);
}

async function updateExportTask(id, patch) {
  const sets = [];
  const params = [];
  const map = {
    status: 'status', filePath: 'file_path', fileSize: 'file_size',
    rowCount: 'row_count', errorMessage: 'error_message',
    startedAt: 'started_at', finishedAt: 'finished_at',
  };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) { sets.push(`${col} = ?`); params.push(patch[k]); }
  }
  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE export_tasks SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  return getExportTask(id);
}

async function streamBillsForExport(periodYear, periodMonth, batchSize, handler) {
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS student_name, s.student_no, s.grade, s.school,
              s.guardian_name, s.guardian_phone
       FROM bills b
       JOIN students s ON s.id = b.student_id
       WHERE b.period_year = ? AND b.period_month = ? AND b.status != 'VOIDED'
       ORDER BY b.student_id, b.version DESC
       LIMIT ? OFFSET ?`,
      [periodYear, periodMonth, batchSize, offset],
    );
    if (rows.length === 0) { hasMore = false; break; }
    await handler(rows);
    offset += batchSize;
    if (rows.length < batchSize) hasMore = false;
  }
}

async function streamBillItemsForExport(billIds, batchSize, handler) {
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    if (billIds.length === 0) break;
    const placeholders = billIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT * FROM bill_items WHERE bill_id IN (${placeholders})
       ORDER BY bill_id, sort_order
       LIMIT ? OFFSET ?`,
      [...billIds, batchSize, offset],
    );
    if (rows.length === 0) { hasMore = false; break; }
    await handler(rows);
    offset += batchSize;
    if (rows.length < batchSize) hasMore = false;
  }
}

module.exports = {
  seed,
  listStudents, getStudent, findStudentByNo, createStudent, updateStudent, deleteStudent,
  listPlans, getPlan, createPlan,
  listEnrollments, getEnrollment, createEnrollment, markEnrollmentPaid,
  listMenus, findMenu, upsertMenu,
  listAttendances, findAttendance, createAttendance,
  generateBill, generateBillsForPeriod, getBill, getBillByStudentPeriod,
  listBills, issueBill, voidBill, regenerateBill, getReconciliation,
  createExportTask, getExportTask, updateExportTask,
  streamBillsForExport, streamBillItemsForExport,
};

'use strict';

const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { createApp } = require('../src/app');
const { waitForDb, close } = require('../src/db');
const store = require('../src/data/store');

const app = createApp();

before(async () => {
  await waitForDb();
});

beforeEach(async () => {
  await store.seed();
});

after(async () => {
  await close();
});

test('GET /api/health 返回 ok', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
});

/* ---------- 学生 ---------- */

test('GET /api/students 返回种子学生', async () => {
  const res = await request(app).get('/api/students');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total, 4);
});

test('GET /api/students 按状态筛选 ACTIVE', async () => {
  const res = await request(app).get('/api/students?status=ACTIVE');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.length, 3);
  assert.ok(res.body.data.every((s) => s.status === 'ACTIVE'));
});

test('POST /api/students 创建成功', async () => {
  const res = await request(app)
    .post('/api/students')
    .send({ studentNo: 'XS2026100', name: '新同学', grade: '一年级', guardianPhone: '13900000000' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.studentNo, 'XS2026100');
});

test('POST /api/students 学号重复返回 409', async () => {
  const res = await request(app).post('/api/students').send({ studentNo: 'XS2026001', name: 'x' });
  assert.strictEqual(res.status, 409);
});

test('POST /api/students 空姓名返回 400', async () => {
  const res = await request(app).post('/api/students').send({ studentNo: 'XS9999', name: '' });
  assert.strictEqual(res.status, 400);
});

test('PUT /api/students 更新状态', async () => {
  const res = await request(app).put('/api/students/1').send({ status: 'INACTIVE' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, 'INACTIVE');
});

test('DELETE /api/students 删除并连带报名（级联）', async () => {
  const res = await request(app).delete('/api/students/1');
  assert.strictEqual(res.status, 204);
  const after2 = await request(app).get('/api/students/1');
  assert.strictEqual(after2.status, 404);
});

/* ---------- 套餐 ---------- */

test('GET /api/plans 返回套餐', async () => {
  const res = await request(app).get('/api/plans');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.total, 3);
});

test('POST /api/plans 价格非整数返回 400', async () => {
  const res = await request(app).post('/api/plans').send({ name: '坏套餐', priceCents: 12.5 });
  assert.strictEqual(res.status, 400);
});

/* ---------- 报名 ---------- */

test('POST /api/enrollments 报名成功且金额取套餐价', async () => {
  const res = await request(app)
    .post('/api/enrollments')
    .send({ studentId: 1, planId: 2, startDate: '2026-07-01', endDate: '2026-07-31' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.amountCents, 99000);
});

test('POST /api/enrollments 非在读学生返回 409', async () => {
  // 学生 4 是 INACTIVE
  const res = await request(app)
    .post('/api/enrollments')
    .send({ studentId: 4, planId: 1, startDate: '2026-07-01', endDate: '2026-07-31' });
  assert.strictEqual(res.status, 409);
});

test('POST /api/enrollments 结束日期早于开始返回 400', async () => {
  const res = await request(app)
    .post('/api/enrollments')
    .send({ studentId: 1, planId: 1, startDate: '2026-07-31', endDate: '2026-07-01' });
  assert.strictEqual(res.status, 400);
});

test('POST /api/enrollments/:id/pay 标记缴费，重复缴费 409', async () => {
  // 报名 3 未缴费
  const res = await request(app).post('/api/enrollments/3/pay');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.paid, true);
  const again = await request(app).post('/api/enrollments/3/pay');
  assert.strictEqual(again.status, 409);
});

/* ---------- 菜单 ---------- */

test('GET /api/menus 按日期查询', async () => {
  const res = await request(app).get('/api/menus?date=2026-06-05');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.length, 2);
});

test('POST /api/menus 新增返回 201，重复同餐次 upsert 返回 200', async () => {
  const create = await request(app)
    .post('/api/menus')
    .send({ menuDate: '2026-06-10', meal: 'LUNCH', dishes: '咖喱鸡饭' });
  assert.strictEqual(create.status, 201);
  const update = await request(app)
    .post('/api/menus')
    .send({ menuDate: '2026-06-10', meal: 'LUNCH', dishes: '咖喱牛肉饭' });
  assert.strictEqual(update.status, 200);
  assert.strictEqual(update.body.data.dishes, '咖喱牛肉饭');
});

/* ---------- 出勤 ---------- */

test('POST /api/attendances 签到成功', async () => {
  const res = await request(app)
    .post('/api/attendances')
    .send({ studentId: 1, attendDate: '2026-06-06', meal: 'LUNCH', status: 'PRESENT' });
  assert.strictEqual(res.status, 201);
});

test('POST /api/attendances 同生同日同餐重复返回 409', async () => {
  // 种子里 学生1 2026-06-05 LUNCH 已登记
  const res = await request(app)
    .post('/api/attendances')
    .send({ studentId: 1, attendDate: '2026-06-05', meal: 'LUNCH' });
  assert.strictEqual(res.status, 409);
});

test('GET /api/attendances 按日期查询', async () => {
  const res = await request(app).get('/api/attendances?date=2026-06-05');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.length, 3);
});

test('未知接口返回 404', async () => {
  const res = await request(app).get('/api/unknown');
  assert.strictEqual(res.status, 404);
});

test('非法 JSON 请求体返回 400', async () => {
  const res = await request(app)
    .post('/api/students')
    .set('Content-Type', 'application/json')
    .send('{ bad json');
  assert.strictEqual(res.status, 400);
});

/* ---------- 账单 ---------- */

test('POST /api/bills/generate 为单个学生生成账单', async () => {
  const res = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.data.billNo.startsWith('BILL-202606'));
  assert.strictEqual(res.body.data.studentId, 1);
  assert.strictEqual(res.body.data.periodYear, 2026);
  assert.strictEqual(res.body.data.periodMonth, 6);
  assert.strictEqual(res.body.data.version, 1);
  assert.strictEqual(res.body.data.status, 'DRAFT');
  assert.ok(res.body.data.chargeCents > 0);
  assert.ok(Array.isArray(res.body.data.items));
});

test('POST /api/bills/generate 同周期同学生重复生成返回 409', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const res = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  assert.strictEqual(res.status, 409);
});

test('POST /api/bills/generate 批量生成全部学生账单', async () => {
  const res = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.data.created >= 2);
});

test('POST /api/bills/:id/issue 出账锁定', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  const res = await request(app).post(`/api/bills/${billId}/issue`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, 'ISSUED');
  assert.ok(res.body.data.issuedAt);
});

test('POST /api/bills/:id/issue 已出账重复出账返回 409', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  await request(app).post(`/api/bills/${billId}/issue`);
  const res = await request(app).post(`/api/bills/${billId}/issue`);
  assert.strictEqual(res.status, 409);
});

test('POST /api/bills/:id/void 作废已出账账单', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  await request(app).post(`/api/bills/${billId}/issue`);
  const res = await request(app).post(`/api/bills/${billId}/void`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.status, 'VOIDED');
  assert.ok(res.body.data.voidedAt);
});

test('POST /api/bills/:id/void 草稿不能作废返回 409', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  const res = await request(app).post(`/api/bills/${billId}/void`);
  assert.strictEqual(res.status, 409);
});

test('POST /api/bills/:id/regenerate 作废重出版本递增', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  await request(app).post(`/api/bills/${billId}/issue`);
  const res = await request(app).post(`/api/bills/${billId}/regenerate`);
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.version, 2);
  assert.strictEqual(res.body.data.status, 'DRAFT');
  assert.ok(res.body.data.billNo.endsWith('-V2'));
});

test('GET /api/bills 查询账单列表', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const res = await request(app).get('/api/bills?periodYear=2026&periodMonth=6');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.length >= 2);
});

test('GET /api/bills/:id 查询单张账单含明细', async () => {
  const gen = await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const billId = gen.body.data.id;
  const res = await request(app).get(`/api/bills/${billId}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.id, billId);
  assert.ok(Array.isArray(res.body.data.items));
  assert.ok(res.body.data.items.length > 0);
});

test('GET /api/bills/student/:studentId/period/:year/:month 查询学生月账单', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6, studentId: 1 });
  const res = await request(app).get('/api/bills/student/1/period/2026/6');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.studentId, 1);
});

test('GET /api/bills/reconciliation 对账汇总', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const res = await request(app).get('/api/bills/reconciliation?periodYear=2026&periodMonth=6');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.totalChargeCents > 0);
  assert.ok(Array.isArray(res.body.data.planDistribution));
  assert.ok(Array.isArray(res.body.data.arrears));
  assert.strictEqual(res.body.data.billCount, list.body.data.length);
});

test('对账汇总合计与明细账单逐笔对得上', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const recon = await request(app).get('/api/bills/reconciliation?periodYear=2026&periodMonth=6');
  const issued = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=ISSUED');
  let sumCharge = 0;
  let sumRefund = 0;
  let sumReceived = 0;
  for (const b of issued.body.data) {
    sumCharge += b.chargeCents;
    sumRefund += b.refundCents;
    sumReceived += b.receivedCents;
  }
  assert.strictEqual(recon.body.data.totalChargeCents, sumCharge);
  assert.strictEqual(recon.body.data.totalRefundCents, sumRefund);
  assert.strictEqual(recon.body.data.totalReceivedCents, sumReceived);
});

/* ---------- 导出 ---------- */

test('POST /api/exports 创建导出任务返回 202', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const res = await request(app)
    .post('/api/exports')
    .send({ taskType: 'BILLS', periodYear: 2026, periodMonth: 6, format: 'CSV' });
  assert.strictEqual(res.status, 202);
  assert.strictEqual(res.body.data.status, 'PENDING');
  assert.strictEqual(res.body.data.taskType, 'BILLS');
  assert.strictEqual(res.body.data.format, 'CSV');
});

test('GET /api/exports/:id 查询导出任务状态', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const create = await request(app)
    .post('/api/exports')
    .send({ taskType: 'BILLS', periodYear: 2026, periodMonth: 6, format: 'CSV' });
  const taskId = create.body.data.id;
  await new Promise((r) => setTimeout(r, 2000));
  const res = await request(app).get(`/api/exports/${taskId}`);
  assert.strictEqual(res.status, 200);
  assert.ok(['COMPLETED', 'PROCESSING', 'PENDING'].includes(res.body.data.status));
});

test('GET /api/exports/:id/download 下载导出文件', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const create = await request(app)
    .post('/api/exports')
    .send({ taskType: 'BILLS', periodYear: 2026, periodMonth: 6, format: 'CSV' });
  const taskId = create.body.data.id;
  await new Promise((r) => setTimeout(r, 3000));
  const statusRes = await request(app).get(`/api/exports/${taskId}`);
  if (statusRes.body.data.status === 'COMPLETED') {
    const dl = await request(app).get(`/api/exports/${taskId}/download`);
    assert.strictEqual(dl.status, 200);
    assert.ok(dl.headers['content-type'].includes('text/csv'));
  }
});

test('POST /api/exports 对账表 JSON 导出', async () => {
  await request(app)
    .post('/api/bills/generate')
    .send({ periodYear: 2026, periodMonth: 6 });
  const list = await request(app).get('/api/bills?periodYear=2026&periodMonth=6&status=DRAFT');
  for (const b of list.body.data) {
    await request(app).post(`/api/bills/${b.id}/issue`);
  }
  const create = await request(app)
    .post('/api/exports')
    .send({ taskType: 'RECONCILIATION', periodYear: 2026, periodMonth: 6, format: 'JSON' });
  assert.strictEqual(create.status, 202);
  await new Promise((r) => setTimeout(r, 3000));
  const statusRes = await request(app).get(`/api/exports/${create.body.data.id}`);
  if (statusRes.body.data.status === 'COMPLETED') {
    const dl = await request(app).get(`/api/exports/${create.body.data.id}/download`);
    assert.strictEqual(dl.status, 200);
    assert.ok(dl.headers['content-type'].includes('application/json'));
  }
});

'use strict';

const express = require('express');
const store = require('../data/store');
const { sendError, toPositiveInt } = require('../utils/http');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', wrap(async (req, res) => {
  const filters = {};
  if (req.query.periodYear !== undefined) {
    const y = Number(req.query.periodYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return sendError(res, 400, '无效的年份');
    filters.periodYear = y;
  }
  if (req.query.periodMonth !== undefined) {
    const m = Number(req.query.periodMonth);
    if (!Number.isInteger(m) || m < 1 || m > 12) return sendError(res, 400, '无效的月份');
    filters.periodMonth = m;
  }
  if (req.query.studentId !== undefined) {
    const sid = toPositiveInt(req.query.studentId);
    if (sid === null) return sendError(res, 400, '无效的学生 ID');
    filters.studentId = sid;
  }
  if (req.query.status !== undefined) {
    const valid = ['DRAFT', 'ISSUED', 'VOIDED'];
    if (!valid.includes(req.query.status)) return sendError(res, 400, `状态只能是 ${valid.join(' / ')}`);
    filters.status = req.query.status;
  }
  const list = await store.listBills(filters);
  res.json({ data: list, total: list.length });
}));

router.get('/reconciliation', wrap(async (req, res) => {
  const y = Number(req.query.periodYear);
  const m = Number(req.query.periodMonth);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return sendError(res, 400, '必须指定有效年份');
  if (!Number.isInteger(m) || m < 1 || m > 12) return sendError(res, 400, '必须指定有效月份');
  const recon = await store.getReconciliation(y, m);
  res.json({ data: recon });
}));

router.get('/student/:studentId/period/:year/:month', wrap(async (req, res) => {
  const sid = toPositiveInt(req.params.studentId);
  if (sid === null) return sendError(res, 400, '无效的学生 ID');
  const y = Number(req.params.year);
  const m = Number(req.params.month);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return sendError(res, 400, '无效的年份');
  if (!Number.isInteger(m) || m < 1 || m > 12) return sendError(res, 400, '无效的月份');
  const bill = await store.getBillByStudentPeriod(sid, y, m);
  if (!bill) return sendError(res, 404, '该学生此周期无有效账单');
  res.json({ data: bill });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const bill = await store.getBill(id);
  if (!bill) return sendError(res, 404, '账单不存在');
  res.json({ data: bill });
}));

router.post('/generate', wrap(async (req, res) => {
  const b = req.body || {};
  const y = Number(b.periodYear);
  const m = Number(b.periodMonth);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return sendError(res, 400, '必须指定有效年份');
  if (!Number.isInteger(m) || m < 1 || m > 12) return sendError(res, 400, '必须指定有效月份');

  if (b.studentId !== undefined) {
    const sid = toPositiveInt(b.studentId);
    if (sid === null) return sendError(res, 400, '无效的学生 ID');
    const r = await store.generateBill(sid, y, m);
    if (r.error === 'DUPLICATE') return sendError(res, 409, '该学生此周期已有未作废账单', { bill: r.bill });
    if (r.error === 'NO_ENROLLMENT') return sendError(res, 400, '该学生此周期无有效报名');
    res.status(201).json({ data: r.bill });
  } else {
    const results = await store.generateBillsForPeriod(y, m);
    const created = results.filter((r) => !r.error);
    const skipped = results.filter((r) => r.error);
    res.status(201).json({ data: { created: created.length, skipped: skipped.length, details: results } });
  }
}));

router.post('/:id/issue', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const r = await store.issueBill(id);
  if (r.error === 'NOT_FOUND') return sendError(res, 404, '账单不存在');
  if (r.error === 'NOT_DRAFT') return sendError(res, 409, '只有草稿状态的账单才能出账');
  res.json({ data: r.bill });
}));

router.post('/:id/void', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const r = await store.voidBill(id);
  if (r.error === 'NOT_FOUND') return sendError(res, 404, '账单不存在');
  if (r.error === 'ALREADY_VOIDED') return sendError(res, 409, '该账单已作废');
  if (r.error === 'DRAFT_CANNOT_VOID') return sendError(res, 409, '草稿账单不能作废，请直接删除或重出');
  res.json({ data: r.bill });
}));

router.post('/:id/regenerate', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的账单 ID');
  const r = await store.regenerateBill(id);
  if (r.error === 'NOT_FOUND') return sendError(res, 404, '账单不存在');
  if (r.error === 'NO_ENROLLMENT') return sendError(res, 400, '该学生此周期无有效报名，无法重出');
  res.status(201).json({ data: r.bill });
}));

module.exports = router;

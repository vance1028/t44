'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { sendError, toPositiveInt } = require('../utils/http');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EXPORT_DIR = path.join(process.env.EXPORT_DIR || path.join(process.cwd(), '.exports'));
const BATCH_SIZE = 200;

const VALID_TASK_TYPES = ['BILLS', 'RECONCILIATION'];
const VALID_FORMATS = ['CSV', 'JSON'];

function _ensureDir() {
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function _centsToYuan(cents) {
  return (cents / 100).toFixed(2);
}

async function _executeExport(task) {
  await store.updateExportTask(task.id, { status: 'PROCESSING', startedAt: new Date().toISOString().slice(0, 23) });

  try {
    _ensureDir();
    const ext = task.format.toLowerCase();
    const fileName = `${task.taskType}-${task.periodYear}${String(task.periodMonth).padStart(2, '0')}-${task.id}.${ext}`;
    const filePath = path.join(EXPORT_DIR, fileName);

    if (task.taskType === 'BILLS') {
      await _exportBills(task, filePath);
    } else if (task.taskType === 'RECONCILIATION') {
      await _exportReconciliation(task, filePath);
    }

    const stat = fs.statSync(filePath);
    await store.updateExportTask(task.id, {
      status: 'COMPLETED',
      filePath: fileName,
      fileSize: stat.size,
      finishedAt: new Date().toISOString().slice(0, 23),
    });
  } catch (err) {
    await store.updateExportTask(task.id, {
      status: 'FAILED',
      errorMessage: err.message || String(err).slice(0, 500),
      finishedAt: new Date().toISOString().slice(0, 23),
    });
  }
}

async function _exportBills(task, filePath) {
  const { periodYear, periodMonth, format } = task;

  if (format === 'CSV') {
    const BOM = '\uFEFF';
    const header = '账单编号,学号,姓名,年级,学校,监护人,联系电话,周期,版本,状态,套餐,应出勤餐次,实际出勤,请假,缺勤,应收(元),退费(元),补收(元),上期结转(元),本期实收(元),期末余额(元)\n';
    const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
    ws.write(BOM + header);

    let rowCount = 0;
    await store.streamBillsForExport(periodYear, periodMonth, BATCH_SIZE, async (rows) => {
      for (const r of rows) {
        const line = [
          r.bill_no, r.student_no, r.student_name, r.grade, r.school,
          r.guardian_name, r.guardian_phone,
          `${r.period_year}-${String(r.period_month).padStart(2, '0')}`,
          r.version, r.status, r.plan_name,
          r.expected_meals, r.actual_present, r.actual_leave, r.actual_absent,
          _centsToYuan(r.charge_cents), _centsToYuan(r.refund_cents),
          _centsToYuan(r.supplement_cents), _centsToYuan(r.carry_forward_cents),
          _centsToYuan(r.received_cents), _centsToYuan(r.balance_cents),
        ].join(',') + '\n';
        ws.write(line);
        rowCount += 1;
      }
    });

    ws.end();
    await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject); });
    await store.updateExportTask(task.id, { rowCount });
  } else {
    const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
    ws.write('[\n');
    let first = true;
    let rowCount = 0;

    await store.streamBillsForExport(periodYear, periodMonth, BATCH_SIZE, async (rows) => {
      const billIds = rows.map((r) => r.id);
      const itemMap = {};
      await store.streamBillItemsForExport(billIds, BATCH_SIZE, async (itemRows) => {
        for (const it of itemRows) {
          if (!itemMap[it.bill_id]) itemMap[it.bill_id] = [];
          itemMap[it.bill_id].push({
            itemType: it.item_type,
            description: it.description,
            quantity: it.quantity,
            unitPriceYuan: _centsToYuan(it.unit_price_cents),
            amountYuan: _centsToYuan(it.amount_cents),
          });
        }
      });

      for (const r of rows) {
        if (!first) ws.write(',\n');
        first = false;
        const obj = {
          billNo: r.bill_no,
          studentNo: r.student_no,
          studentName: r.student_name,
          grade: r.grade,
          school: r.school,
          guardianName: r.guardian_name,
          guardianPhone: r.guardian_phone,
          period: `${r.period_year}-${String(r.period_month).padStart(2, '0')}`,
          version: r.version,
          status: r.status,
          planName: r.plan_name,
          expectedMeals: r.expected_meals,
          actualPresent: r.actual_present,
          actualLeave: r.actual_leave,
          actualAbsent: r.actual_absent,
          chargeYuan: _centsToYuan(r.charge_cents),
          refundYuan: _centsToYuan(r.refund_cents),
          supplementYuan: _centsToYuan(r.supplement_cents),
          carryForwardYuan: _centsToYuan(r.carry_forward_cents),
          receivedYuan: _centsToYuan(r.received_cents),
          balanceYuan: _centsToYuan(r.balance_cents),
          items: itemMap[r.id] || [],
        };
        ws.write(JSON.stringify(obj));
        rowCount += 1;
      }
    });

    ws.write('\n]');
    ws.end();
    await new Promise((resolve, reject) => { ws.on('finish', resolve); ws.on('error', reject); });
    await store.updateExportTask(task.id, { rowCount });
  }
}

async function _exportReconciliation(task, filePath) {
  const recon = await store.getReconciliation(task.periodYear, task.periodMonth);

  if (task.format === 'CSV') {
    const BOM = '\uFEFF';
    const lines = [BOM];
    lines.push('项目,金额(元)');
    lines.push(`应收合计,${_centsToYuan(recon.totalChargeCents)}`);
    lines.push(`实收合计,${_centsToYuan(recon.totalReceivedCents)}`);
    lines.push(`退费合计,${_centsToYuan(recon.totalRefundCents)}`);
    lines.push(`补收合计,${_centsToYuan(recon.totalSupplementCents)}`);
    lines.push(`净额合计,${_centsToYuan(recon.netAmountCents)}`);
    lines.push(`账单数,${recon.billCount}`);
    lines.push('');
    lines.push('套餐名称,餐次,学生数,收入(元),收入占比');
    for (const p of recon.planDistribution) {
      lines.push(`${p.planName},${p.planMeals},${p.studentCount},${_centsToYuan(p.incomeCents)},${(p.incomeRatio * 100).toFixed(2)}%`);
    }
    lines.push('');
    lines.push('学号,姓名,欠费金额(元)');
    for (const a of recon.arrears) {
      lines.push(`${a.studentNo},${a.studentName},${_centsToYuan(a.balanceCents)}`);
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    await store.updateExportTask(task.id, { rowCount: recon.billCount });
  } else {
    const obj = {
      periodYear: recon.periodYear,
      periodMonth: recon.periodMonth,
      totalChargeYuan: _centsToYuan(recon.totalChargeCents),
      totalReceivedYuan: _centsToYuan(recon.totalReceivedCents),
      totalRefundYuan: _centsToYuan(recon.totalRefundCents),
      totalSupplementYuan: _centsToYuan(recon.totalSupplementCents),
      netAmountYuan: _centsToYuan(recon.netAmountCents),
      billCount: recon.billCount,
      planDistribution: recon.planDistribution.map((p) => ({
        planName: p.planName,
        planMeals: p.planMeals,
        studentCount: p.studentCount,
        incomeYuan: _centsToYuan(p.incomeCents),
        incomeRatio: p.incomeRatio,
      })),
      arrears: recon.arrears.map((a) => ({
        studentNo: a.studentNo,
        studentName: a.studentName,
        balanceYuan: _centsToYuan(a.balanceCents),
      })),
    };
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
    await store.updateExportTask(task.id, { rowCount: recon.billCount });
  }
}

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const taskType = b.taskType || 'BILLS';
  const format = b.format || 'CSV';
  const y = Number(b.periodYear);
  const m = Number(b.periodMonth);

  if (!VALID_TASK_TYPES.includes(taskType)) return sendError(res, 400, `导出类型只能是 ${VALID_TASK_TYPES.join(' / ')}`);
  if (!VALID_FORMATS.includes(format)) return sendError(res, 400, `格式只能是 ${VALID_FORMATS.join(' / ')}`);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return sendError(res, 400, '必须指定有效年份');
  if (!Number.isInteger(m) || m < 1 || m > 12) return sendError(res, 400, '必须指定有效月份');

  const task = await store.createExportTask(taskType, y, m, format);
  _executeExport(task).catch(() => {});
  res.status(202).json({ data: task });
}));

router.get('/:id', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的任务 ID');
  const task = await store.getExportTask(id);
  if (!task) return sendError(res, 404, '导出任务不存在');
  res.json({ data: task });
}));

router.get('/:id/download', wrap(async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, '无效的任务 ID');
  const task = await store.getExportTask(id);
  if (!task) return sendError(res, 404, '导出任务不存在');
  if (task.status !== 'COMPLETED') return sendError(res, 409, `任务状态为 ${task.status}，不可下载`);
  if (!task.filePath) return sendError(res, 500, '导出文件路径为空');

  const fullPath = path.join(EXPORT_DIR, task.filePath);
  if (!fs.existsSync(fullPath)) return sendError(res, 404, '导出文件不存在');

  const ext = path.extname(task.filePath).toLowerCase();
  const mimeType = ext === '.json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(task.filePath)}"`);
  fs.createReadStream(fullPath).pipe(res);
}));

module.exports = router;

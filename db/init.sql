-- 容器首次初始化脚本（docker-entrypoint-initdb.d）= schema + seed 合并

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS students (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    student_no    VARCHAR(32)  NOT NULL,
    name          VARCHAR(64)  NOT NULL,
    grade         VARCHAR(32)  NOT NULL DEFAULT '',
    school        VARCHAR(128) NOT NULL DEFAULT '',
    guardian_name VARCHAR(64)  NOT NULL DEFAULT '',
    guardian_phone VARCHAR(20) NOT NULL DEFAULT '',
    allergies     VARCHAR(255) NOT NULL DEFAULT '',
    status        VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_students_no (student_no),
    KEY idx_students_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_plans (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    name         VARCHAR(64)  NOT NULL,
    meals        VARCHAR(64)  NOT NULL DEFAULT 'LUNCH',
    price_cents  INT          NOT NULL DEFAULT 0,
    period       VARCHAR(16)  NOT NULL DEFAULT 'MONTHLY',
    description  VARCHAR(500) NOT NULL DEFAULT '',
    active       TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    student_id   BIGINT       NOT NULL,
    plan_id      BIGINT       NOT NULL,
    start_date   DATE         NOT NULL,
    end_date     DATE         NOT NULL,
    amount_cents INT          NOT NULL DEFAULT 0,
    paid         TINYINT(1)   NOT NULL DEFAULT 0,
    status       VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_enroll_student (student_id),
    KEY idx_enroll_plan (plan_id),
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT fk_enroll_plan FOREIGN KEY (plan_id) REFERENCES meal_plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_menus (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    menu_date   DATE         NOT NULL,
    meal        VARCHAR(16)  NOT NULL DEFAULT 'LUNCH',
    dishes      VARCHAR(1000) NOT NULL DEFAULT '',
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_menu_date_meal (menu_date, meal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendances (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    student_id   BIGINT       NOT NULL,
    attend_date  DATE         NOT NULL,
    meal         VARCHAR(16)  NOT NULL DEFAULT 'LUNCH',
    status       VARCHAR(16)  NOT NULL DEFAULT 'PRESENT',
    picked_up_by VARCHAR(64)  NOT NULL DEFAULT '',
    checked_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    remark       VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (id),
    UNIQUE KEY uk_attend (student_id, attend_date, meal),
    KEY idx_attend_date (attend_date),
    CONSTRAINT fk_attend_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO students (id, student_no, name, grade, school, guardian_name, guardian_phone, allergies, status) VALUES
  (1, 'XS2026001', '小明', '三年级', '实验小学', '王女士', '13800001111', '花生', 'ACTIVE'),
  (2, 'XS2026002', '小红', '四年级', '实验小学', '李先生', '13800002222', '', 'ACTIVE'),
  (3, 'XS2026003', '小刚', '二年级', '中心小学', '张女士', '13800003333', '海鲜', 'ACTIVE'),
  (4, 'XS2026004', '小丽', '五年级', '中心小学', '赵先生', '13800004444', '', 'INACTIVE');

INSERT IGNORE INTO meal_plans (id, name, meals, price_cents, period, description, active) VALUES
  (1, '工作日午餐月套餐', 'LUNCH', 60000, 'MONTHLY', '周一至周五午餐', 1),
  (2, '午晚两餐月套餐', 'LUNCH,DINNER', 99000, 'MONTHLY', '周一至周五午餐+晚餐含作业辅导', 1),
  (3, '单日午餐', 'LUNCH', 3000, 'DAILY', '临时单日午餐', 1);

INSERT IGNORE INTO enrollments (id, student_id, plan_id, start_date, end_date, amount_cents, paid, status) VALUES
  (1, 1, 1, '2026-06-01', '2026-06-30', 60000, 1, 'ACTIVE'),
  (2, 2, 2, '2026-06-01', '2026-06-30', 99000, 1, 'ACTIVE'),
  (3, 3, 1, '2026-06-01', '2026-06-30', 60000, 0, 'ACTIVE');

INSERT IGNORE INTO daily_menus (id, menu_date, meal, dishes) VALUES
  (1, '2026-06-05', 'LUNCH', '红烧鸡腿、清炒时蔬、紫菜蛋汤、米饭'),
  (2, '2026-06-05', 'DINNER', '番茄牛腩、蒜蓉西兰花、米饭'),
  (3, '2026-06-06', 'LUNCH', '糖醋里脊、麻婆豆腐、冬瓜汤、米饭');

INSERT IGNORE INTO attendances (id, student_id, attend_date, meal, status, picked_up_by, remark) VALUES
  (1, 1, '2026-06-05', 'LUNCH', 'PRESENT', '', '正常用餐'),
  (2, 2, '2026-06-05', 'LUNCH', 'PRESENT', '', '正常用餐'),
  (3, 3, '2026-06-05', 'LUNCH', 'ABSENT', '', '家长请假');

CREATE TABLE IF NOT EXISTS bills (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    bill_no           VARCHAR(32)  NOT NULL,
    student_id        BIGINT       NOT NULL,
    period_year       SMALLINT     NOT NULL,
    period_month      TINYINT      NOT NULL,
    version           INT          NOT NULL DEFAULT 1,
    prev_bill_id      BIGINT       NULL DEFAULT NULL,
    status            VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
    plan_id           BIGINT       NOT NULL,
    plan_name         VARCHAR(64)  NOT NULL DEFAULT '',
    plan_meals        VARCHAR(64)  NOT NULL DEFAULT '',
    plan_price_cents  INT          NOT NULL DEFAULT 0,
    expected_meals    INT          NOT NULL DEFAULT 0,
    actual_present    INT          NOT NULL DEFAULT 0,
    actual_leave      INT          NOT NULL DEFAULT 0,
    actual_absent     INT          NOT NULL DEFAULT 0,
    charge_cents      INT          NOT NULL DEFAULT 0,
    refund_cents      INT          NOT NULL DEFAULT 0,
    supplement_cents  INT          NOT NULL DEFAULT 0,
    carry_forward_cents INT        NOT NULL DEFAULT 0,
    received_cents    INT          NOT NULL DEFAULT 0,
    balance_cents     INT          NOT NULL DEFAULT 0,
    issued_at         DATETIME(3)  NULL DEFAULT NULL,
    voided_at         DATETIME(3)  NULL DEFAULT NULL,
    created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_bill_no (bill_no),
    UNIQUE KEY uk_bill_period_ver (student_id, period_year, period_month, version),
    KEY idx_bill_student (student_id),
    KEY idx_bill_period (period_year, period_month),
    KEY idx_bill_status (status),
    CONSTRAINT fk_bill_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
    CONSTRAINT fk_bill_plan FOREIGN KEY (plan_id) REFERENCES meal_plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bill_items (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    bill_id         BIGINT       NOT NULL,
    item_type       VARCHAR(32)  NOT NULL,
    description     VARCHAR(255) NOT NULL DEFAULT '',
    quantity        INT          NOT NULL DEFAULT 1,
    unit_price_cents INT         NOT NULL DEFAULT 0,
    amount_cents    INT          NOT NULL DEFAULT 0,
    sort_order      INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_bitem_bill (bill_id),
    CONSTRAINT fk_bitem_bill FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS export_tasks (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    task_type       VARCHAR(32)  NOT NULL,
    period_year     SMALLINT     NOT NULL,
    period_month    TINYINT      NOT NULL,
    format          VARCHAR(8)   NOT NULL DEFAULT 'CSV',
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    file_path       VARCHAR(500) NOT NULL DEFAULT '',
    file_size       INT          NOT NULL DEFAULT 0,
    row_count       INT          NOT NULL DEFAULT 0,
    error_message   VARCHAR(500) NOT NULL DEFAULT '',
    started_at      DATETIME(3)  NULL DEFAULT NULL,
    finished_at     DATETIME(3)  NULL DEFAULT NULL,
    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY idx_exp_status (status),
    KEY idx_exp_period (period_year, period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

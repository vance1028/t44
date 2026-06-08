-- 学生小饭桌管理平台 - 表结构（MySQL）

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

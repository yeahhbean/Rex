-- rex.sql
create database rex;
use rex;

-- 1. 개인 정보 테이블
create table user_private(
    id varchar(20) primary key, -- id
    oauth_provider varchar(20) DEFAULT NULL,  -- 예: 'google', 'kakao', 'naver'
    password varchar(30), -- 비번
    name varchar(20) not null, -- 이름
    birth date not null, -- 생년월일
    phone varchar(20) unique not null, -- 전화번호
    email varchar(30) unique not null, -- 이메일
    gender enum('M', 'F') not null, -- 성별
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 생성 일시
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- 업데이트 일시
);
-- 2. 사용자 프로필 테이블
create table user_profile(
    profile_id int AUTO_INCREMENT primary key, -- 프로필 아이디
    id varchar(20) unique not null, -- 아이디
    nickname varchar(20), -- 닉네임 중복 허용
    profile_image TEXT, -- 프로필 이미지
    FOREIGN KEY (id) REFERENCES user_private(id) ON DELETE CASCADE
);
-- 3. 지출 카테고리 테이블
create table categories(
    category_id int AUTO_INCREMENT primary key,
    category_name varchar(20) not null unique
);
-- categories 테이블에 고정된 카테고리 값 넣음
INSERT INTO categories (category_name) VALUES
('식비'),
('주거비'),
('교통비'),
('쇼핑'),
('고정지출'),
('취미/여가'),
('건강/의료'),
('교육'),
('경조사'),
('유흥비'),
('여행'),
('카페/간식'),
('생필품'),
('기타'),
('수입');
-- 4. 지출 입력 테이블
create table expenses(
    expense_id int AUTO_INCREMENT primary key,
    id varchar(20) not null,
    category_id int not null,
    type enum('income', 'expense') not null default 'expense',
    memo varchar(50) not null,
    amount int not null,
    spent_at date not null,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES user_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);
-- 5. 지출 분석 테이블
create table emotional_feedback(
    feedback_id int AUTO_INCREMENT primary key,
    expense_id int not null,
    is_emotional boolean not null,
    feedback text,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE
);
# 출근체크 (Attendance Check)

카메라로 출근 시점 사진을 찍고, 접속한 공인 IP가 허용된 네트워크(예: 회사 공유기)인지
확인해서 출근을 기록하는 웹앱입니다.

- 프론트엔드: React + Vite + Tailwind CSS
- 백엔드: Google Apps Script (Google Sheets + Google Drive)

## 동작 방식

1. 페이지 접속 시 브라우저 카메라 권한을 요청하고 실시간 미리보기를 보여줍니다.
2. 이름을 입력하고 "출근체크 하기"를 누르면:
   - 현재 영상 프레임을 캡처해 JPEG(base64)로 변환합니다.
   - `api.ipify.org`를 통해 **현재 접속한 공인(외부) IP**를 조회합니다.
   - 이름 + IP + 사진을 Apps Script 웹앱으로 전송합니다.
3. 서버(Apps Script)는:
   - 사진을 Google Drive의 `AttendancePhotos` 폴더에 저장합니다.
   - IP가 허용 목록에 있는지 확인합니다.
   - 결과를 Google Sheets의 `Attendance` 시트에 한 줄로 기록합니다.
   - 허용 여부를 프론트엔드에 응답합니다.

## ⚠️ 알고 있어야 할 한계

- 브라우저는 PC의 **사설(로컬) IP**(예: 192.168.x.x)를 알 수 없습니다. 여기서 쓰는 IP는
  공유기/회사 네트워크가 외부로 나갈 때 보이는 **공인 IP**입니다.
- IP는 클라이언트(브라우저)가 스스로 조회해서 전송하는 값이라, 강한 보안 인증이 아니라
  **느슨한 출근 기록 보조 수단**입니다. 값을 조작해서 보내면 속일 수 있습니다. 엄격한 위치
  검증이 필요하다면 서버가 직접 요청 IP를 확인할 수 있는 백엔드(Node.js, Cloudflare Workers 등)로
  교체해야 합니다.
- 카메라 접근은 HTTPS(또는 localhost)에서만 동작합니다.

## 설정 방법

### 1. Google Apps Script 배포

1. [script.google.com](https://script.google.com)에서 새 프로젝트를 만들고 `apps-script/Code.gs`
   내용을 복사해 넣습니다.
2. 프로젝트 설정 → **스크립트 속성**에서 `ALLOWED_IPS`를 등록합니다.
   - 값 예시: `123.45.67.89,123.45.67.90` (쉼표로 여러 개 등록 가능)
   - 등록하지 않으면 당분간 모든 IP를 허용 처리합니다.
3. 배포 → 새 배포 → 유형: **웹 앱**으로 배포합니다.
   - 실행 계정: 나
   - 액세스 권한: 링크가 있는 모든 사용자
4. 배포된 웹앱 URL을 복사합니다.

### 2. 프론트엔드 환경변수

`.env.example`을 `.env`로 복사하고 위에서 복사한 URL을 넣습니다.

```
VITE_ATTENDANCE_API_URL=https://script.google.com/macros/s/xxxx/exec
```

### 3. 실행

```bash
npm install
npm run dev
```

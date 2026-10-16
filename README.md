# Mbox 관리 대시보드

Vite + React 관리 화면입니다. 배포 주소는 https://managementmbox.netlify.app (Netlify 사이트 `managementmbox`)이고, 데이터는 mboxcon과 같은 Supabase 프로젝트 `gdzzxrrxgshiiavwvqzg`를 사용합니다.

## 로그인

비밀번호를 만들지 않습니다. 허용된 이메일로 매직 링크를 보내고, 메일 안의 링크를 누르면 세션이 생깁니다.

허용 이메일(대소문자 무시): `01042870788sm@gmail.com`

로그인되지 않으면 업로드·조회 화면은 열리지 않습니다. 다른 이메일로 세션이 생기면 앱이 바로 로그아웃합니다. 테이블 접근 자체는 Supabase RLS가 결정합니다. 이 저장소에서는 RLS와 Storage 버킷을 바꾸지 않습니다.

`dataService.ts`의 기존 Supabase 호출은 그대로입니다. 로그인 후 같은 클라이언트가 세션 JWT를 자동으로 붙입니다.

## 운영자가 확인할 Supabase Auth 설정

이 코드는 Supabase 대시보드를 수정하지 않습니다. Authentication에서 아래를 확인해 주세요.

프로젝트: `gdzzxrrxgshiiavwvqzg`

### 1. Email 사용

Authentication → Providers → Email

- Enable Email: 켜기
- 첫 로그인 전에는 새 사용자 가입(Allow new users to sign up)을 켜 두세요. `signInWithOtp`가 해당 주소의 사용자를 처음 만듭니다.
- 첫 로그인에 성공한 뒤에는 새 사용자 가입을 끄는 것을 권장합니다. 화면의 이메일 허용 목록은 API를 직접 호출하는 경우를 막지 못합니다. RLS가 `authenticated` 전체라면, 다른 주소로 가입한 계정도 데이터를 읽을 수 있습니다.

### 2. URL Configuration

Authentication → URL Configuration

Site URL:

```
https://managementmbox.netlify.app
```

Redirect URLs (`emailRedirectTo`는 `window.location.origin`이라 슬래시 없는 주소가 그대로 전달됩니다. `/**`만 등록하면 루트 주소가 빠질 수 있어 둘 다 넣습니다):

```
https://managementmbox.netlify.app
https://managementmbox.netlify.app/**
http://localhost:3000
http://localhost:3000/**
http://127.0.0.1:3000
http://127.0.0.1:3000/**
```

로컬 개발 서버 포트는 `vite.config.ts`의 `server.port`인 3000입니다. 다른 포트로 열리면 그 origin도 Redirect URLs에 추가하세요.

클라이언트는 implicit flow를 사용합니다. 매직 링크는 `#access_token` 해시로 돌아오고, `detectSessionInUrl: true`가 그 해시를 세션으로 저장합니다.

### 3. 첫 로그인

1. https://managementmbox.netlify.app 을 엽니다.
2. `01042870788sm@gmail.com` 이 입력되어 있습니다.
3. **이메일로 로그인 링크 받기**를 누릅니다.
4. Gmail에서 메일을 열고 링크를 누릅니다.

메일이 오지 않으면 스팸함, Authentication → Email, 그리고 기본 메일 발송 한도(커스텀 SMTP가 없으면 시간당 발송이 매우 적습니다)를 확인하세요.

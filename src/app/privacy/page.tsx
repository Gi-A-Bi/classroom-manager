import type { Metadata } from "next";

// 개인정보처리방침 — 정적 페이지(서버 컴포넌트).
// 본문은 법적 고지문이라 마크업을 그대로 유지한다. 스타일은 이 파일 안의
// scoped <style>로 두어 전역 Tailwind 설정과 충돌하지 않게 한다.
export const metadata: Metadata = {
  title: "개인정보처리방침 | 학교수첩",
  description: "학교수첩이 처리하는 개인정보의 항목·목적·보유기간과 정보주체의 권리를 안내합니다.",
  robots: { index: false },
};

const CSS = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
  line-height:1.75;color:#1f2328;background:#fff;-webkit-text-size-adjust:100%}
.wrap{max-width:780px;margin:0 auto;padding:40px 20px 80px}
h1{font-size:1.7rem;line-height:1.35;margin:0 0 6px;letter-spacing:-.02em}
.sub{color:#59636e;font-size:.95rem;margin:0 0 28px}
h2{font-size:1.12rem;margin:38px 0 10px;padding-top:18px;border-top:1px solid #e4e8ec;letter-spacing:-.01em}
p,li{font-size:.97rem}
ul,ol{padding-left:1.35em}
li{margin:.28em 0}
code{background:#f2f4f6;padding:.1em .38em;border-radius:4px;font-size:.87em;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.92rem;display:block;overflow-x:auto}
th,td{border:1px solid #d8dee4;padding:9px 11px;text-align:left;vertical-align:top}
th{background:#f6f8fa;font-weight:600;white-space:nowrap}
.todo{display:inline-block;background:#fff3cd;border:1px solid #e0b93c;color:#6b4e00;
  padding:.1em .45em;border-radius:4px;font-size:.88em;font-weight:600}
.warn{display:inline-block;background:#ffe3e3;border:1px solid #d94a4a;color:#8a1f1f;
  padding:.1em .45em;border-radius:4px;font-size:.88em;font-weight:600}
.warn-inline{background:#fff5f5;border-left:3px solid #d94a4a;padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
.highlight{background:#e8f5e9;border-left:3px solid #2e7d32;padding:10px 14px;margin:14px 0;border-radius:0 6px 6px 0}
.note{color:#59636e;font-size:.88rem;margin-top:8px}
.draft{background:#fff8e1;border:1px solid #e0b93c;border-radius:8px;padding:14px 18px;margin:0 0 26px}
.draft strong{display:block;margin-bottom:6px}
.draft p{margin:.4em 0;font-size:.92rem}
footer{margin-top:48px;padding-top:18px;border-top:1px solid #e4e8ec;color:#59636e;font-size:.88rem}
a{color:#0969da}
@media (prefers-color-scheme:dark){
  body{background:#0d1117;color:#e6edf3}
  h2{border-top-color:#30363d}
  .sub,.note,footer{color:#9198a1}
  code{background:#21262d}
  th,td{border-color:#30363d}
  th{background:#161b22}
  .todo{background:#3d2f00;border-color:#9e7700;color:#f0d58c}
  .warn{background:#3d1d1d;border-color:#c04a4a;color:#ffb3b3}
  .warn-inline{background:#2b1414}
  .highlight{background:#12261a}
  .draft{background:#2b2413;border-color:#7a6320}
  footer{border-top-color:#30363d}
}
`;

export default function PrivacyPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
      <h1>개인정보처리방침</h1>
      <p className="sub">학교수첩</p>

      <div className="draft">
        <strong>⚠️ 검토 중인 초안입니다 — 아직 공개용이 아닙니다</strong>
        <p>앱의 실제 코드와 데이터베이스 스키마를 확인해 작성했으나, 노란색
        <span className="todo">[확인 필요]</span> 및 빨간색 <span className="warn">[조치 필요]</span> 표시가
        남아 있습니다. 이 표시를 모두 채우고 검토를 마친 뒤 공개해 주세요.</p>
      
      </div>
      <p>학교수첩은 교사가 학급을 개설해 알림장·일정·시간표를 학생과 공유하고, 개인 업무 공간과 학급운영 도구를 함께 사용하는 학급운영 플랫폼입니다. 운영자는 「개인정보 보호법」에 따라 정보주체의 개인정보를 보호하고
      이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>

      <h2>제1조 (개인정보의 처리 목적)</h2>
      <ol>
      <li><strong>교사 계정 관리</strong> — 회원 가입·로그인, 학급 개설 및 본인 학급 데이터 식별</li>
      <li><strong>학생 인증</strong> — 학급코드·출석번호·PIN을 통한 학생 본인 확인</li>
      <li><strong>학급 운영</strong> — 알림장·일정·시간표 공유, 출결 기록, 평가 결과 및 학급 운영 기록 관리</li>
      <li><strong>교사 업무 지원</strong> — 교사 개인 업무 공간(할 일·업무 노트·문서)의 저장과 조회</li>
      </ol>

      <h2>제2조 (처리하는 개인정보의 항목)</h2>
      <table>
      <thead><tr><th>구분</th><th>수집 항목</th><th>수집 방법</th></tr></thead>
      <tbody>
      <tr><td>교사</td><td>이메일 주소, 비밀번호(암호화 저장), 표시 이름</td><td>회원 가입 시 직접 입력</td></tr>
      <tr><td>학생 (필수)</td><td>출석번호, 닉네임, PIN(<strong>해시 처리하여 저장</strong>)</td><td>교사가 명렬 등록 시 입력</td></tr>
      <tr><td>학생 (선택)</td><td>실명</td><td>교사가 선택적으로 입력 — 입력하지 않아도 서비스 이용 가능</td></tr>
      <tr><td>학급 운영 기록</td><td>출결 기록, 평가·성적 결과, 학급 운영 기록, 학급 도구 결과</td><td>교사의 학급 운영 과정에서 생성</td></tr>
      </tbody>
      </table>
      <p className="warn-inline">이 서비스는 <strong>출결·성적·학급 운영 기록</strong>을 처리합니다.
      학생에게 민감한 정보이므로 특히 주의하여 관리합니다.</p>
      <p>주민등록번호, 생년월일, 연락처, 주소 등은 <strong>필드 자체를 두지 않아</strong> 수집이 불가능합니다.</p>

      <h2>제3조 (개인정보의 최소 수집과 보유·이용 기간)</h2>
      <p>이 서비스는 설계 단계부터 개인정보 최소화를 원칙으로 합니다.
      학생은 <strong>출석번호와 닉네임만으로 운영</strong>할 수 있으며, 실명은 선택 항목입니다.
      생년월일·연락처 등 민감정보 필드는 데이터베이스에 존재하지 않습니다.</p>
      <p>학급 데이터는 학년도 단위로 관리되며, 매 학년도 전환 시 이전 데이터를 아카이브하는 구조입니다.</p>
      <p>보유·이용 기간: <strong>해당 학년도 종료 시까지</strong> 보유하며, 학년도가 끝나면 파기합니다.
      교사가 학급이나 학생을 삭제하는 경우에는 그 시점에 즉시 파기합니다.</p>

      <h2>제4조 (만 14세 미만 아동의 개인정보 보호)</h2>
      <p>학생은 이메일 없이 <strong>학급코드 + 출석번호 + PIN</strong>으로 접속하며,
      회원 가입 절차나 이메일·연락처 제공 없이 이용합니다.
      학생 계정은 담임교사가 학급 운영 목적으로 생성합니다.</p>
    
      <p>이 서비스는 학교의 학급 운영을 지원하는 도구입니다. 학생의 개인정보는 학교가 학년 초에
      법정대리인(보호자)으로부터 받은 <strong>개인정보 수집·이용 동의</strong>의 범위에서 처리하며,
      그 범위를 넘어서는 처리가 필요한 경우에는 이 서비스에 대한 <strong>별도의 동의</strong>를
      받은 뒤 처리합니다.</p>
      <p>학생의 개인정보에 대한 열람·정정·삭제·처리정지 요구는 법정대리인이 제8조의 개인정보
      보호책임자(담당 교사)에게 요청할 수 있습니다.</p>

      <h2>제5조 (개인정보의 파기)</h2>
      <p>교사가 학생 또는 학급을 삭제하면 해당 데이터는 데이터베이스에서 즉시 삭제됩니다
      (학급 삭제 시 소속 학생·기록이 함께 삭제되도록 <code>ON DELETE CASCADE</code>로 구성).</p>
      <p>보유기간이 지난 개인정보는 <strong>해당 학년도 종료 시</strong> 파기합니다.
      전자적 파일 형태로 저장된 정보는 복구할 수 없는 방법으로 영구 삭제합니다.</p>

      <h2>제6조 (개인정보의 안전성 확보 조치)</h2>
      <ul>
      <li><strong>테넌트 격리 이중 강제</strong> — 교사는 자기 학급 데이터만, 학생은 자기 학급의 공개
      데이터만 접근할 수 있습니다. 접근 제어를 애플리케이션 코드뿐 아니라
      데이터베이스의 Row Level Security(RLS) 정책으로도 이중으로 강제합니다.</li>
      <li><strong>PIN 해시 저장</strong> — 학생 PIN은 원문이 아니라 해시 값으로 저장하여
      운영자도 원래 PIN을 알 수 없습니다. 최초 로그인 시 PIN 변경을 강제합니다.</li>
      <li>전송 구간 암호화 — 모든 통신에 HTTPS 적용</li>
      <li>비밀번호는 인증 서비스가 암호화하여 저장합니다</li>
      </ul>
      <p className="note">근거: <code>supabase/migrations/</code>의 RLS 정책,
      <code>students.pin_hash</code> 컬럼 및 익명 접근 차단 마이그레이션.</p>

      <h2>제7조 (정보주체의 권리·의무 및 행사 방법)</h2>
      <p>정보주체(교사, 학생 및 그 법정대리인)는 언제든지 다음 권리를 행사할 수 있습니다.</p>
      <ol>
      <li>개인정보 열람 요구</li>
      <li>오류가 있을 경우 정정 요구</li>
      <li>삭제 요구</li>
      <li>처리정지 요구</li>
      </ol>
      <p>권리 행사는 제8조의 개인정보 보호책임자(담당 교사)에게 요청할 수 있으며, 운영자는 지체 없이
      조치합니다. 학생 본인 또는 법정대리인이 요구하는 경우에도 같습니다.</p>

      <h2>제8조 (개인정보 보호책임자)</h2>
      <p>운영자는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 문의·불만 처리와
      피해 구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
      <ul>
      <li>개인정보 보호책임자: 담당 교사</li>
      </ul>
      <p>정보주체는 개인정보 처리에 관한 문의, 열람·정정·삭제·처리정지 요구, 불만 처리, 피해 구제에
      관한 사항을 담당 교사에게 요청할 수 있으며, 운영자는 지체 없이 답변하고 처리합니다.</p>
      <p>개인정보 침해로 인한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
      <ul>
      <li>개인정보침해신고센터 — 국번없이 118 (privacy.kisa.or.kr)</li>
      <li>개인정보 분쟁조정위원회 — 1833-6972 (kopico.go.kr)</li>
      </ul>

      <h2>제9조 (개인정보의 제3자 제공)</h2>
      <p>운영자는 정보주체의 개인정보를 제3자에게 제공하지 않습니다.
      학생의 출결·성적 정보는 해당 학급 담당 교사 외에는 조회할 수 없습니다.
      다만 법령에 특별한 규정이 있는 경우에는 예외로 합니다.</p>

      <h2>제10조 (개인정보 처리의 위탁)</h2>
      <table>
      <thead><tr><th>수탁자</th><th>위탁 업무</th></tr></thead>
      <tbody>
      <tr><td>Supabase, Inc.</td><td>데이터베이스 및 회원 인증 서비스 운영</td></tr>
      <tr><td>Vercel Inc.</td><td>웹 애플리케이션 호스팅</td></tr>
      </tbody>
      </table>

      <h2>제11조 (개인정보의 국외 이전)</h2>
      <p>위 수탁자는 모두 국외 사업자이며, 서비스 제공을 위해 개인정보가 국외에서 처리됩니다.</p>
      <ul>
      <li>이전되는 항목: 제2조의 수집 항목 및 접속 시 IP 주소</li>
      <li>이전 국가·시기·방법: 서비스 이용 시점에 정보통신망을 통해 전송</li>
      <li>이전받는 자: Supabase, Inc. / Vercel Inc.</li>
      <li>이용 목적 및 보유 기간: 위탁 업무 수행에 필요한 기간</li>
      </ul>
      <p className="note"><span className="todo">[확인 필요 — Supabase 프로젝트의 실제 리전(국가)을 확인해 기재하면 더 정확합니다]</span></p>

      <h2>제12조 (개인정보처리방침의 변경)</h2>
      <p>이 개인정보처리방침은 시행일부터 적용됩니다. 법령·서비스 변경에 따라 내용이 추가·삭제·수정될
      때에는 변경 사항을 시행 7일 전부터 이 페이지에 공지합니다.</p>

      <footer>
        <p>시행일: <span className="todo">[확인 필요 — 시행일 (공개하는 날짜)]</span></p>
      </footer>
      </div>
    </>
  );
}

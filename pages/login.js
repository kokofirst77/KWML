// 로그인 페이지 — 학생 로그인 및 교사 대시보드 접근
Pages.login = {

    // 페이지 HTML 렌더링
    render(containerId) {
        document.getElementById(containerId).innerHTML = `
        <div class="login-wrapper">
            <div class="login-card">
                <div class="login-logo">🌿</div>
                <div class="login-title">KWLM Lab</div>
                <div class="login-subtitle">중학교 2학년 광합성 탐구 학습</div>

                <!-- 학생 로그인 폼 -->
                <div class="form-group">
                    <label class="form-label">이름</label>
                    <input class="form-input" id="login-name" type="text"
                           placeholder="이름을 입력하세요" maxlength="10" autocomplete="off">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">반</label>
                        <select class="form-select" id="login-class">
                            <option value="">반 선택</option>
                            ${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}반</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">번호</label>
                        <select class="form-select" id="login-number">
                            <option value="">번호 선택</option>
                            ${Array.from({length: 35}, (_, i) => i + 1)
                                .map(n => `<option value="${n}">${n}번</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button class="btn-primary" id="login-btn">탐구 시작하기 🚀</button>

                <div class="login-divider"><span>교사용</span></div>

                <div class="form-group">
                    <label class="form-label">교사 코드</label>
                    <input class="form-input" id="teacher-code" type="password"
                           placeholder="4자리 코드 입력" maxlength="4">
                </div>
                <button class="btn-secondary" id="teacher-login-btn">교사 대시보드로 이동</button>

                <div id="login-error" class="error-msg" style="display:none;"></div>
            </div>
        </div>`;

        this.attachEvents();
    },

    // 버튼·키보드 이벤트 연결
    attachEvents() {
        document.getElementById('login-btn')
            .addEventListener('click', () => this.studentLogin());
        document.getElementById('teacher-login-btn')
            .addEventListener('click', () => this.teacherLogin());

        // Enter 키로도 로그인 가능
        document.getElementById('login-name')
            .addEventListener('keydown', e => { if (e.key === 'Enter') this.studentLogin(); });
        document.getElementById('teacher-code')
            .addEventListener('keydown', e => { if (e.key === 'Enter') this.teacherLogin(); });
    },

    // 학생 로그인 처리
    studentLogin() {
        const name    = document.getElementById('login-name').value.trim();
        const cls     = document.getElementById('login-class').value;
        const number  = document.getElementById('login-number').value;
        const errorEl = document.getElementById('login-error');

        if (!name || !cls || !number) {
            errorEl.textContent = '이름, 반, 번호를 모두 입력해주세요.';
            errorEl.style.display = 'block';
            return;
        }

        localStorage.setItem('kwlmlab_student', JSON.stringify({ name, class: cls, number }));
        App.navigate('home');
    },

    // 교사 코드 확인 후 대시보드 이동
    teacherLogin() {
        const code    = document.getElementById('teacher-code').value.trim();
        const correct = window.KWLMLAB_CONFIG?.teacherCode || '1234';
        const errorEl = document.getElementById('login-error');

        if (code !== correct) {
            errorEl.textContent = '교사 코드가 올바르지 않습니다.';
            errorEl.style.display = 'block';
            return;
        }
        App.navigate('dashboard');
    }
};

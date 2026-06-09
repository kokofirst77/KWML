// M단계 페이지 — 더 알고 싶은 것 (심화 질문 → AI 탐구 과제 제안)
Pages['m-page'] = {

    // 페이지 렌더링 — 저장된 결과 불러오기
    render(containerId) {
        const savedResult = localStorage.getItem(App.getKey('m'));
        const savedText   = localStorage.getItem(App.getKey('m_text')) || '';
        let resultHtml    = '';

        if (savedResult) {
            try {
                resultHtml = this.buildResultCard(JSON.parse(savedResult));
            } catch (_) {}
        }

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="page-title">🔍 M — 더 알고 싶은 것</div>
                <div class="page-desc">
                    수업 후 생긴 심화 질문을 입력해보세요!<br>
                    AI가 여러분의 궁금증에 맞는 탐구 과제를 추천해 드립니다.
                </div>
            </div>

            <!-- 질문 입력 영역 -->
            <div class="content-card">
                <label class="form-label">심화 질문 입력</label>
                <div style="display:flex;gap:10px;">
                    <input class="form-input" id="m-input" type="text"
                           value="${this.escapeAttr(savedText)}"
                           placeholder="예: 식물은 밤에도 광합성을 할 수 있을까요?" maxlength="200">
                    <button class="chat-send-btn" id="m-ask-btn"
                            style="white-space:nowrap;padding:0 20px;border-radius:var(--radius);">
                        탐구 과제 추천받기
                    </button>
                </div>
            </div>

            <!-- 에러 메시지 -->
            <div id="m-error" class="error-msg" style="display:none;"></div>

            <!-- 탐구 과제 결과 카드 -->
            <div id="m-result" style="display:${savedResult ? 'block' : 'none'};">
                ${resultHtml}
            </div>

            <button class="btn-complete" id="m-complete-btn">M단계 완료 ✓</button>
        </div>`;

        this.attachEvents();
    },

    // HTML 이스케이프 (텍스트 출력용)
    escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    // 속성값 이스케이프 (input value용)
    escapeAttr(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },

    // 탐구 과제 결과 카드 HTML 생성
    buildResultCard(data) {
        const categoryClass = data.category === '개념 보충' ? 'concept' : 'transfer';
        const keywordsHtml  = (data.keywords || [])
            .map(k => `<span class="keyword-tag">${this.escapeHtml(k)}</span>`)
            .join('');

        return `
        <div class="result-card">
            <div>
                <span class="category-tag ${categoryClass}">${this.escapeHtml(data.category || '')}</span>
            </div>
            <p style="font-weight:700;font-size:16px;color:var(--color-primary);margin-bottom:12px;">
                ${this.escapeHtml(data.summary || '')}
            </p>
            <p style="font-size:15px;line-height:1.7;color:var(--color-text);">
                ${this.escapeHtml(data.proposal || '')}
            </p>
            <div class="keyword-tags">${keywordsHtml}</div>
            <div class="action-box">
                💪 <strong>지금 해볼 수 있어요:</strong> ${this.escapeHtml(data.action || '')}
            </div>
        </div>`;
    },

    // 이벤트 연결
    attachEvents() {
        document.getElementById('m-ask-btn')
            .addEventListener('click', () => this.ask());
        document.getElementById('m-input')
            .addEventListener('keydown', e => { if (e.key === 'Enter') this.ask(); });
        document.getElementById('m-complete-btn')
            .addEventListener('click', () => this.complete());
    },

    // 탐구 과제 추천 요청 (Claude API 호출)
    async ask() {
        const text = document.getElementById('m-input').value.trim();
        if (!text) {
            document.getElementById('m-error').textContent = '심화 질문을 입력해주세요.';
            document.getElementById('m-error').style.display = 'block';
            return;
        }

        document.getElementById('m-error').style.display = 'none';

        // 버튼 비활성화 및 로딩 표시
        const btn = document.getElementById('m-ask-btn');
        btn.disabled    = true;
        btn.textContent = '⏳ AI가 분석하는 중...';

        // 질문 저장
        localStorage.setItem(App.getKey('m_text'), text);

        // 결과 영역에 로딩 표시
        const resultEl = document.getElementById('m-result');
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
        <div class="result-card" style="text-align:center;">
            <div class="loading-dots" style="justify-content:center;margin-bottom:12px;">
                <span></span><span></span><span></span>
            </div>
            <p style="color:var(--color-muted);">AI가 탐구 과제를 분석하고 있어요...</p>
        </div>`;

        try {
            let fullResponse = '';
            await Claude.callClaude(
                PROMPTS.m,
                [{ role: 'user', content: text }],
                chunk => { fullResponse += chunk; }
            );

            // 순수 JSON 파싱 (마크다운 코드블록 제거)
            const jsonStr = fullResponse.replace(/```json\s*|```/g, '').trim();
            const data    = JSON.parse(jsonStr);

            // 결과 저장 및 카드 렌더링
            localStorage.setItem(App.getKey('m'), JSON.stringify(data));
            resultEl.innerHTML = this.buildResultCard(data);

        } catch (err) {
            resultEl.style.display = 'none';
            document.getElementById('m-error').textContent =
                (err instanceof SyntaxError)
                    ? 'AI 응답을 분석하지 못했습니다. 다시 시도해주세요.'
                    : (err.message || '오류가 발생했습니다.');
            document.getElementById('m-error').style.display = 'block';
        } finally {
            btn.disabled    = false;
            btn.textContent = '탐구 과제 다시 추천받기';
        }
    },

    // M단계 완료 처리
    complete() {
        const saved = localStorage.getItem(App.getKey('m'));
        if (!saved) {
            alert('먼저 탐구 과제를 추천받아보세요! 🔍');
            return;
        }
        App.completeStep('m');
        App.navigate('home');
    }
};

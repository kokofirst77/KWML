// K단계 페이지 — 메타인지 자극 AI 튜터 (입력 카드 방식)
Pages['k-page'] = {

    entries:      [],   // [{id, studentInput, aiResponse, hasMisconception, misconceptionType, isWrapUp, timestamp}]
    conversation: [],   // [{role, content}] — Claude API 누적 대화
    isLoading:    false,
    isWrapUp:     false,

    // 페이지 렌더링
    render(containerId) {
        const savedEntries = localStorage.getItem(App.getKey('k_entries'));
        const savedConv    = localStorage.getItem(App.getKey('k_conv'));
        this.entries      = savedEntries ? JSON.parse(savedEntries) : [];
        this.conversation  = savedConv   ? JSON.parse(savedConv)    : [];
        this.isWrapUp     = this.entries.some(e => e.isWrapUp);
        this.isLoading    = false;

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="page-title">💡 K — 내가 아는 것</div>
                <div class="page-desc">광합성에 대해 알고 있는 것을 모두 적어보세요!</div>
            </div>

            <!-- 입력 영역 -->
            <div class="content-card">
                <div style="display:flex;gap:10px;">
                    <input class="form-input" id="k-input" type="text"
                           placeholder="광합성에 대해 알고 있는 것을 자유롭게 적어보세요"
                           maxlength="300" style="flex:1;">
                    <button class="chat-send-btn" id="k-send-btn"
                            style="white-space:nowrap;padding:0 20px;border-radius:var(--radius);">
                        등록하기
                    </button>
                </div>
                <div id="k-error" class="error-msg" style="display:none;margin-top:8px;"></div>
            </div>

            <!-- 입력 내역 누적 표시 -->
            <div id="k-entries-list">
                ${this.renderEntries()}
            </div>

            <!-- W단계 이동 버튼 (입력 수에 따라 상태 변경) -->
            <button class="btn-complete" id="k-next-btn">
                ${this.isWrapUp ? '사진 보러 가기 →' : 'W단계로 이동하기 →'}
            </button>
        </div>`;

        this.attachEvents();
        this.updateNextBtn();
    },

    // 입력 내역 HTML 생성
    renderEntries() {
        if (this.entries.length === 0) {
            return `<div class="content-card" style="text-align:center;color:#bbb;padding:32px 24px;">
                        🌱 알고 있는 것을 위에서 입력해보세요!
                    </div>`;
        }
        return this.entries.map(e => `
        <div class="k-entry-card${e.isWrapUp ? ' k-entry-wrapup' : ''}">
            <div class="k-entry-student">💬 <strong>${this.escapeHtml(e.studentInput)}</strong></div>
            <div class="k-entry-ai">🤖 ${this.escapeHtml(e.aiResponse)}</div>
        </div>`).join('');
    },

    // XSS 방지
    escapeHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    },

    // 이벤트 연결
    attachEvents() {
        document.getElementById('k-send-btn').addEventListener('click', () => this.send());
        document.getElementById('k-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); this.send(); }
        });
        document.getElementById('k-next-btn').addEventListener('click', () => {
            if (this.entries.length < 2) {
                alert('광합성에 대해 조금 더 이야기해보세요! (2개 이상 입력 필요) 💬');
                return;
            }
            App.completeStep('k');
            App.navigate('w-page');
        });
    },

    // 학생 입력 전송 및 AI 응답 처리
    async send() {
        if (this.isLoading) return;
        const input = document.getElementById('k-input');
        const text  = input.value.trim();
        if (!text) return;

        this.isLoading = true;
        input.value    = '';
        document.getElementById('k-send-btn').disabled = true;
        document.getElementById('k-error').style.display = 'none';

        // 로딩 카드 삽입
        const list      = document.getElementById('k-entries-list');
        const loadingId = 'k-loading-' + Date.now();
        if (this.entries.length === 0) list.innerHTML = ''; // 빈 상태 문구 제거
        list.insertAdjacentHTML('beforeend', `
        <div class="k-entry-card" id="${loadingId}">
            <div class="k-entry-student">💬 <strong>${this.escapeHtml(text)}</strong></div>
            <div class="k-entry-ai" style="display:flex;align-items:center;gap:8px;">
                <div class="loading-dots"><span></span><span></span><span></span></div>
                <small style="color:#999;">AI가 생각하는 중...</small>
            </div>
        </div>`);
        list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // 누적 대화에 사용자 발화 추가
        this.conversation.push({ role: 'user', content: text });

        try {
            // 스트리밍으로 수신하되 JSON 파싱은 완료 후 실행
            let fullResponse = '';
            await Claude.callClaude(PROMPTS.k, this.conversation, chunk => {
                fullResponse += chunk;
            });

            // JSON 파싱
            let parsed = {};
            try {
                parsed = JSON.parse(fullResponse.trim());
            } catch (_) {
                // JSON 파싱 실패 시 응답 텍스트를 그대로 사용
                parsed = { response: fullResponse, hasMisconception: false, misconceptionType: null, isWrapUp: false };
            }

            const aiText = parsed.response || fullResponse;
            const entry  = {
                id:               Date.now().toString(),
                studentInput:     text,
                aiResponse:       aiText,
                hasMisconception: !!parsed.hasMisconception,
                misconceptionType: parsed.misconceptionType || null,
                isWrapUp:         !!parsed.isWrapUp,
                timestamp:        Date.now()
            };

            // 누적 대화에 AI 응답 추가 (전체 JSON 문자열로 저장해야 다음 턴에서 단계 파악 가능)
            this.conversation.push({ role: 'assistant', content: fullResponse });

            this.entries.push(entry);
            if (entry.isWrapUp) this.isWrapUp = true;
            this.save();

            // 로딩 카드를 완성된 카드로 교체
            const loadingCard = document.getElementById(loadingId);
            if (loadingCard) {
                loadingCard.outerHTML = `
                <div class="k-entry-card${entry.isWrapUp ? ' k-entry-wrapup' : ''}">
                    <div class="k-entry-student">💬 <strong>${this.escapeHtml(text)}</strong></div>
                    <div class="k-entry-ai">🤖 ${this.escapeHtml(aiText)}</div>
                </div>`;
            }

            this.updateNextBtn();

            // isWrapUp 수신 시 버튼 강조 애니메이션
            if (entry.isWrapUp) {
                const btn = document.getElementById('k-next-btn');
                if (btn) {
                    btn.textContent = '사진 보러 가기 →';
                    btn.classList.add('btn-wrapup', 'pulse-once');
                    setTimeout(() => btn.classList.remove('pulse-once'), 1200);
                }
            }

        } catch (err) {
            // 실패 시 로딩 카드 제거 + 대화 롤백
            const loadingCard = document.getElementById(loadingId);
            if (loadingCard) loadingCard.remove();
            if (this.entries.length === 0) list.innerHTML = this.renderEntries();
            this.conversation.pop();

            document.getElementById('k-error').textContent = err.message || 'API 오류가 발생했습니다.';
            document.getElementById('k-error').style.display = 'block';
        } finally {
            this.isLoading = false;
            const btn = document.getElementById('k-send-btn');
            if (btn) btn.disabled = false;
            const inp = document.getElementById('k-input');
            if (inp) inp.focus();
        }
    },

    // W단계 이동 버튼 상태 업데이트
    updateNextBtn() {
        const btn   = document.getElementById('k-next-btn');
        if (!btn) return;
        const count = this.entries.length;

        if (count < 2) {
            // 비활성화: 0~1개 입력
            btn.style.opacity    = '0.4';
            btn.style.cursor     = 'not-allowed';
            btn.style.background = '#aaa';
            btn.classList.remove('btn-wrapup');
        } else if (this.isWrapUp) {
            // 강조: isWrapUp 수신 시
            btn.style.opacity    = '';
            btn.style.cursor     = '';
            btn.style.background = '';
            btn.classList.add('btn-wrapup');
            btn.textContent = '사진 보러 가기 →';
        } else {
            // 일반 활성화: 2개 이상 입력
            btn.style.opacity    = '';
            btn.style.cursor     = '';
            btn.style.background = '';
            btn.classList.remove('btn-wrapup');
        }
    },

    // localStorage 저장
    save() {
        localStorage.setItem(App.getKey('k_entries'), JSON.stringify(this.entries));
        localStorage.setItem(App.getKey('k_conv'),    JSON.stringify(this.conversation));
    }
};

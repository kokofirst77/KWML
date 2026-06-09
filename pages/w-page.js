// W단계 페이지 — 알고 싶은 것 (질문 입력 + 워드클라우드)
Pages['w-page'] = {

    questions: [],  // 현재 학생의 질문 목록

    // 페이지 렌더링 — 저장된 질문 불러오기
    render(containerId) {
        const saved    = localStorage.getItem(App.getKey('w'));
        this.questions = saved ? JSON.parse(saved) : [];

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="page-title">❓ W — 알고 싶은 것</div>
                <div class="page-desc">
                    광합성에 대해 궁금한 점을 입력해보세요!<br>
                    우리 반 친구들의 질문이 아래 워드클라우드에 실시간으로 표시됩니다.
                </div>
            </div>

            <!-- 질문 입력 영역 -->
            <div class="content-card">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">새 질문 추가</label>
                    <div style="display:flex;gap:10px;">
                        <input class="form-input" id="w-input" type="text"
                               placeholder="광합성에 대해 궁금한 것을 입력하세요..." maxlength="100">
                        <button class="chat-send-btn" id="w-add-btn"
                                style="white-space:nowrap;padding:0 20px;border-radius:var(--radius);">
                            추가
                        </button>
                    </div>
                </div>
                <div id="w-question-list" style="margin-top:16px;">
                    ${this.renderList()}
                </div>
            </div>

            <!-- 워드클라우드 섹션 -->
            <div class="wordcloud-section">
                <div class="wordcloud-title">🔍 우리 반 궁금한 것들</div>
                <div id="wordcloud-container">${Wordcloud.render()}</div>
            </div>

            <button class="btn-complete" id="w-complete-btn">W단계 완료 ✓</button>
        </div>`;

        this.attachEvents();

        // 30초마다 워드클라우드 자동 갱신
        window._pageInterval = setInterval(() => {
            const wc = document.getElementById('wordcloud-container');
            if (wc) wc.innerHTML = Wordcloud.render();
        }, 30000);
    },

    // 질문 목록 HTML 생성
    renderList() {
        if (this.questions.length === 0) {
            return `<p style="color:#bbb;font-size:14px;text-align:center;padding:12px 0;">
                        아직 입력한 질문이 없어요. 위에서 질문을 추가해보세요!
                    </p>`;
        }
        return `<ul class="question-list">` +
            this.questions.map((q, i) => `
            <li class="question-item">
                <span>❓ ${this.escapeHtml(q)}</span>
                <button class="question-delete" data-idx="${i}" title="삭제">✕</button>
            </li>`).join('') +
            `</ul>`;
    },

    // HTML 이스케이프
    escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    // 이벤트 연결
    attachEvents() {
        document.getElementById('w-add-btn')
            .addEventListener('click', () => this.addQuestion());
        document.getElementById('w-input')
            .addEventListener('keydown', e => { if (e.key === 'Enter') this.addQuestion(); });

        // 질문 삭제 버튼 (이벤트 위임)
        document.getElementById('w-question-list')
            .addEventListener('click', e => {
                if (e.target.classList.contains('question-delete')) {
                    const idx = parseInt(e.target.dataset.idx);
                    this.questions.splice(idx, 1);
                    this.save();
                    document.getElementById('w-question-list').innerHTML = this.renderList();
                    // 워드클라우드 즉시 갱신
                    const wc = document.getElementById('wordcloud-container');
                    if (wc) wc.innerHTML = Wordcloud.render();
                }
            });

        document.getElementById('w-complete-btn')
            .addEventListener('click', () => {
                if (this.questions.length === 0) {
                    alert('질문을 하나 이상 입력해주세요! ❓');
                    return;
                }
                App.completeStep('w');
                App.navigate('l-page');
            });
    },

    // 질문 추가
    addQuestion() {
        const input = document.getElementById('w-input');
        const text  = input.value.trim();
        if (!text) return;

        this.questions.push(text);
        this.save();
        input.value = '';
        document.getElementById('w-question-list').innerHTML = this.renderList();

        // 워드클라우드 즉시 갱신
        const wc = document.getElementById('wordcloud-container');
        if (wc) wc.innerHTML = Wordcloud.render();
    },

    // localStorage에 질문 저장
    save() {
        localStorage.setItem(App.getKey('w'), JSON.stringify(this.questions));
    }
};

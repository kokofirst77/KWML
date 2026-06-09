// 홈 페이지 — KWLM 4단계 진행 현황, 미리보기, 이어하기/새로 시작하기
Pages.home = {

    // 페이지 렌더링
    render(containerId) {
        const student   = App.getStudent();
        const completed = App.getCompleted();

        const stages = [
            { id: 'k', page: 'k-page', icon: '💡', label: 'K — 아는 것',
              desc: 'Claude AI와 대화하며 사전 지식을 확인해요' },
            { id: 'w', page: 'w-page', icon: '❓', label: 'W — 알고 싶은 것',
              desc: '광합성에 대한 궁금한 점을 질문으로 적어봐요' },
            { id: 'l', page: 'l-page', icon: '📖', label: 'L — 배운 것',
              desc: 'AI가 내 설명을 시각화 카드로 만들어줘요' },
            { id: 'm', page: 'm-page', icon: '🔍', label: 'M — 더 알고 싶은 것',
              desc: 'AI가 심화 탐구 과제를 추천해줘요' }
        ];

        // 진행률 계산
        const doneCount   = stages.filter(s => completed[s.id]).length;
        const progressPct = Math.round((doneCount / 4) * 100);

        // 단계 카드 HTML 생성
        const cardsHtml = stages.map(({ id, page, icon, label, desc }) => {
            const isDone   = !!completed[id];
            const preview  = this.getPreview(id);

            // 상태 뱃지
            const statusHtml = isDone
                ? `<div class="stage-card-status done-status">✅ 완료</div>`
                : `<div class="stage-card-status todo-status">⬜ 미시작</div>`;

            // 마지막 작성 내용 미리보기 (저장된 내용이 있을 때만)
            const previewHtml = preview
                ? `<div class="stage-card-preview">"${this.escapeHtml(preview)}"</div>`
                : '';

            // 저장된 내용이 있으면 이어하기/새로 시작하기 표시
            const actionHtml = preview || isDone
                ? `<div class="stage-card-actions">
                       <button class="stage-btn-continue" data-action="continue" data-page="${page}">이어하기</button>
                       <button class="stage-btn-restart"  data-action="restart"  data-page="${page}" data-id="${id}">다시 시작하기</button>
                   </div>`
                : '';

            return `
            <div class="stage-card${isDone ? ' completed' : ''}" data-action="navigate" data-page="${page}">
                <div class="stage-card-icon">${icon}</div>
                <div class="stage-card-title">${label}</div>
                <div class="stage-card-desc">${desc}</div>
                ${statusHtml}
                ${previewHtml}
                ${actionHtml}
            </div>`;
        }).join('');

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="home-welcome">
                안녕하세요, <strong>${this.escapeHtml(student?.name || '학생')}</strong>님! 🌿<br>
                <span style="font-size:16px;font-weight:400;color:var(--color-muted);">
                    ${student ? `${student.class}반 ${student.number}번` : ''} 광합성 탐구를 시작해봐요!
                </span>
            </div>

            <!-- 전체 진행률 바 -->
            <div class="progress-bar-wrap">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:14px;color:var(--color-muted);">전체 진행률</span>
                    <span style="font-size:14px;font-weight:700;color:var(--color-primary);">${doneCount}/4 완료</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width:${progressPct}%;"></div>
                </div>
            </div>

            <!-- 단계 카드 그리드 -->
            <div class="stage-cards" id="stage-cards">${cardsHtml}</div>

            <!-- 하단 관리 버튼 -->
            <div class="home-actions">
                <button class="stage-btn-continue" data-action="print"
                        style="padding:11px 24px;">🖨️ 학습 결과 인쇄</button>
                <button class="stage-btn-restart"  data-action="reset-all"
                        style="padding:11px 24px;">🗑️ 내 기록 초기화</button>
            </div>
        </div>`;

        this.attachEvents(containerId);
    },

    // 단계별 마지막 작성 내용 미리보기 (최대 30자)
    getPreview(id) {
        try {
            if (id === 'k') {
                const raw  = localStorage.getItem(App.getKey('k'));
                if (!raw) return '';
                const msgs = JSON.parse(raw);
                const last = msgs.filter(m => m.role === 'user').pop();
                if (!last) return '';
                return last.content.length > 30 ? last.content.slice(0, 30) + '...' : last.content;
            }
            if (id === 'w') {
                const raw = localStorage.getItem(App.getKey('w'));
                if (!raw) return '';
                const qs  = JSON.parse(raw);
                return qs.length > 0 ? `질문 ${qs.length}개 입력됨` : '';
            }
            if (id === 'l') {
                const raw = localStorage.getItem(App.getKey('l_text'));
                if (!raw) return '';
                return raw.length > 30 ? raw.slice(0, 30) + '...' : raw;
            }
            if (id === 'm') {
                const raw = localStorage.getItem(App.getKey('m_text'));
                if (!raw) return '';
                return raw.length > 30 ? raw.slice(0, 30) + '...' : raw;
            }
        } catch (_) {}
        return '';
    },

    // 이벤트 위임으로 카드·버튼 클릭 처리
    attachEvents(containerId) {
        document.getElementById(containerId).addEventListener('click', e => {
            // data-action 속성을 가진 가장 가까운 요소 탐색
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const { action, page, id } = target.dataset;

            // 버튼 클릭이 카드 클릭으로 전파되지 않도록 차단
            if (action !== 'navigate') e.stopPropagation();

            switch (action) {
                case 'navigate': App.navigate(page);              break;
                case 'continue': App.navigate(page);              break;
                case 'restart':  this.restartStage(id, page);     break;
                case 'print':    this.printResults();              break;
                case 'reset-all': this.resetAll();                 break;
            }
        });
    },

    // 특정 단계 데이터 삭제 후 해당 페이지로 이동
    restartStage(id, page) {
        if (!confirm(`${id.toUpperCase()}단계 기록을 지우고 다시 시작할까요?`)) return;

        const keysMap = {
            k: ['k'],
            w: ['w'],
            l: ['l_card', 'l_text'],
            m: ['m', 'm_text']
        };
        (keysMap[id] || []).forEach(type => {
            const key = App.getKey(type);
            if (key) localStorage.removeItem(key);
        });

        // 완료 상태에서 해당 단계 제거
        const completed = App.getCompleted();
        delete completed[id];
        localStorage.setItem(App.getKey('completed'), JSON.stringify(completed));

        App.navigate(page);
    },

    // 학생 전체 기록 초기화
    resetAll() {
        if (!confirm('모든 학습 기록(K·W·L·M)을 초기화합니다.\n이 작업은 되돌릴 수 없습니다. 계속할까요?')) return;

        ['k', 'w', 'l_card', 'l_text', 'm', 'm_text', 'completed'].forEach(type => {
            const key = App.getKey(type);
            if (key) localStorage.removeItem(key);
        });

        App.navigate('home');
    },

    // 학습 결과 인쇄 (새 창에서 프린트)
    printResults() {
        const student = App.getStudent();

        // K단계 대화 내용
        let kHtml = '<p style="color:#aaa;">기록 없음</p>';
        try {
            const raw  = localStorage.getItem(App.getKey('k'));
            if (raw) {
                const msgs = JSON.parse(raw);
                kHtml = msgs.map(m =>
                    `<p><strong style="color:${m.role === 'user' ? '#2d6a4f' : '#666'};">
                        ${m.role === 'user' ? '학생' : 'AI'}:
                    </strong> ${this.escapeHtml(m.content)}</p>`
                ).join('');
            }
        } catch (_) {}

        // W단계 질문 목록
        let wHtml = '<p style="color:#aaa;">기록 없음</p>';
        try {
            const raw = localStorage.getItem(App.getKey('w'));
            if (raw) {
                const qs = JSON.parse(raw);
                wHtml = qs.map(q => `<p>• ${this.escapeHtml(q)}</p>`).join('') || wHtml;
            }
        } catch (_) {}

        // L단계 설명 텍스트
        let lHtml = '<p style="color:#aaa;">기록 없음</p>';
        const lRaw = localStorage.getItem(App.getKey('l_text'));
        if (lRaw) lHtml = `<p>${this.escapeHtml(lRaw)}</p>`;

        // M단계 탐구 과제 결과
        let mHtml = '<p style="color:#aaa;">기록 없음</p>';
        try {
            const raw = localStorage.getItem(App.getKey('m'));
            if (raw) {
                const d = JSON.parse(raw);
                mHtml = `
                <p><strong>[${this.escapeHtml(d.category || '')}]</strong> ${this.escapeHtml(d.summary || '')}</p>
                <p>${this.escapeHtml(d.proposal || '')}</p>
                <p><strong>실천 방법:</strong> ${this.escapeHtml(d.action || '')}</p>`;
            }
        } catch (_) {}

        const name = student
            ? `${student.class}반 ${student.number}번 ${student.name}`
            : '학생';
        const date = new Date().toLocaleDateString('ko-KR');

        const win = window.open('', '_blank', 'width=800,height=700');
        win.document.write(`<!DOCTYPE html><html lang="ko"><head>
        <meta charset="UTF-8">
        <title>KWLM Lab — 학습 결과</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
        <style>
            body  { font-family:'Noto Sans KR',sans-serif; padding:40px; color:#1b4332; max-width:720px; margin:0 auto; }
            h1    { font-size:22px; border-bottom:2px solid #2d6a4f; padding-bottom:10px; margin-bottom:6px; }
            .meta { color:#888; font-size:13px; margin-bottom:28px; }
            h2    { font-size:16px; color:#2d6a4f; margin:28px 0 10px; border-left:4px solid #52b788; padding-left:10px; }
            p     { font-size:14px; line-height:1.8; margin:5px 0; }
            @media print { body { padding:20px; } }
        </style></head><body>
        <h1>🌿 KWLM Lab — 광합성 탐구 학습 결과</h1>
        <div class="meta">${name} &nbsp;|&nbsp; ${date}</div>
        <h2>💡 K — 아는 것 (AI 대화)</h2>${kHtml}
        <h2>❓ W — 알고 싶은 것 (질문 목록)</h2>${wHtml}
        <h2>📖 L — 배운 것 (텍스트 설명)</h2>${lHtml}
        <h2>🔍 M — 더 알고 싶은 것 (탐구 과제)</h2>${mHtml}
        </body></html>`);
        win.document.close();
        setTimeout(() => win.print(), 500);
    },

    // HTML 이스케이프
    escapeHtml(str) {
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/\n/g,'<br>');
    }
};

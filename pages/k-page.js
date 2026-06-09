// K단계 페이지 — 사전 지식 소크라테스식 AI 챗봇
Pages['k-page'] = {

    messages:  [],   // 대화 기록 [{role, content}]
    isLoading: false,

    // 페이지 렌더링 — localStorage에서 이전 대화 불러오기
    render(containerId) {
        const saved = localStorage.getItem(App.getKey('k'));
        this.messages  = saved ? JSON.parse(saved) : [];
        this.isLoading = false;

        document.getElementById(containerId).innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <div class="page-title">💡 K — 내가 아는 것</div>
                <div class="page-desc">
                    광합성에 대해 아는 것을 자유롭게 말해보세요!<br>
                    AI가 여러분의 생각을 한 단계씩 함께 탐구해 드립니다.
                </div>
            </div>

            <div class="chat-container">
                <div class="chat-messages" id="chat-messages">
                    ${this.messages.length === 0
                        ? `<div class="chat-bubble ai">
                               안녕하세요! 🌿 저는 광합성 탐구를 도와주는 AI예요.<br>
                               광합성에 대해 알고 있는 것을 무엇이든 자유롭게 말해보세요!
                           </div>`
                        : this.renderMessages()}
                </div>
                <div class="chat-input-area">
                    <input class="chat-input" id="chat-input" type="text"
                           placeholder="광합성에 대해 알고 있는 것을 입력하세요..." maxlength="300">
                    <button class="chat-send-btn" id="chat-send-btn">전송</button>
                </div>
            </div>

            <div id="chat-error" class="error-msg" style="display:none;"></div>

            <button class="btn-complete" id="k-complete-btn">K단계 완료 ✓</button>
        </div>`;

        this.attachEvents();
        this.scrollToBottom();
    },

    // 대화 메시지 HTML 생성
    renderMessages() {
        return this.messages.map(m => `
        <div class="chat-bubble ${m.role === 'user' ? 'user' : 'ai'}">
            ${this.escapeHtml(m.content)}
        </div>`).join('');
    },

    // XSS 방지용 HTML 이스케이프
    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    },

    // 이벤트 연결
    attachEvents() {
        document.getElementById('chat-send-btn')
            .addEventListener('click', () => this.send());
        document.getElementById('chat-input')
            .addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
            });
        document.getElementById('k-complete-btn')
            .addEventListener('click', () => this.complete());
    },

    // 메시지 전송 및 AI 응답 처리
    async send() {
        if (this.isLoading) return;
        const input = document.getElementById('chat-input');
        const text  = input.value.trim();
        if (!text) return;

        // 사용자 메시지 추가
        this.messages.push({ role: 'user', content: text });
        input.value = '';
        this.saveAndRender();

        // 로딩 상태 시작
        this.isLoading = true;
        document.getElementById('chat-send-btn').disabled = true;
        document.getElementById('chat-error').style.display = 'none';

        // 로딩 말풍선 삽입
        const msgBox = document.getElementById('chat-messages');
        msgBox.insertAdjacentHTML('beforeend', `
        <div class="chat-bubble ai" id="loading-bubble">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <small style="color:#999;display:block;margin-top:4px;">AI가 생각하는 중...</small>
        </div>`);
        this.scrollToBottom();

        try {
            let aiText = '';
            const loadingBubble = document.getElementById('loading-bubble');

            // Claude API 스트리밍 호출
            await Claude.callClaude(PROMPTS.k, this.messages, chunk => {
                aiText += chunk;
                if (loadingBubble) loadingBubble.innerHTML = this.escapeHtml(aiText);
                this.scrollToBottom();
            });

            // 로딩 버블 제거 후 메시지 배열에 저장
            if (loadingBubble) loadingBubble.remove();
            this.messages.push({ role: 'assistant', content: aiText });
            this.saveAndRender();

        } catch (err) {
            const loadingBubble = document.getElementById('loading-bubble');
            if (loadingBubble) loadingBubble.remove();
            // 사용자 메시지 롤백
            this.messages.pop();
            this.saveAndRender();
            document.getElementById('chat-error').textContent =
                err.message || 'API 호출 중 오류가 발생했습니다.';
            document.getElementById('chat-error').style.display = 'block';
        } finally {
            this.isLoading = false;
            document.getElementById('chat-send-btn').disabled = false;
            const input = document.getElementById('chat-input');
            if (input) input.focus();
        }
    },

    // localStorage 저장 후 메시지 영역 다시 렌더링
    saveAndRender() {
        localStorage.setItem(App.getKey('k'), JSON.stringify(this.messages));
        const msgBox = document.getElementById('chat-messages');
        if (msgBox) {
            msgBox.innerHTML = this.renderMessages();
            this.scrollToBottom();
        }
    },

    // 채팅창 최하단으로 스크롤
    scrollToBottom() {
        const msgBox = document.getElementById('chat-messages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    },

    // K단계 완료 처리
    complete() {
        if (this.messages.length === 0) {
            alert('먼저 AI와 대화를 나눠보세요! 💬');
            return;
        }
        App.completeStep('k');
        App.navigate('w-page');
    }
};

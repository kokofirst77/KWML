// 상단 고정 네비게이션 바 컴포넌트
const Navbar = {

    // 네비게이션 HTML 문자열 생성
    render(student) {
        const completed = App.getCompleted();

        const steps = [
            { id: 'k', page: 'k-page', label: 'K', desc: '사전 지식' },
            { id: 'w', page: 'w-page', label: 'W', desc: '알고 싶은 것' },
            { id: 'l', page: 'l-page', label: 'L', desc: '배운 것' },
            { id: 'm', page: 'm-page', label: 'M', desc: '더 알고 싶은 것' }
        ];

        const stepsHtml = steps.map(({ id, page, label, desc }) => {
            const isDone = completed[id];
            const icon   = isDone ? '✅ ' : '';
            return `<button class="nav-step-btn${isDone ? ' completed' : ''}"
                            data-page="${page}"
                            title="${desc}"
                    >${icon}${label}</button>`;
        }).join('');

        const name = student
            ? `${student.class}반 ${student.number}번 ${student.name}`
            : '';

        return `
        <nav class="navbar">
            <button class="navbar-logo" onclick="App.navigate('home')">🌿 KWLM Lab</button>
            <div class="navbar-steps">${stepsHtml}</div>
            <div class="navbar-user">
                <span>${name}</span>
                <button class="logout-btn" onclick="App.logout()">로그아웃</button>
            </div>
        </nav>`;
    },

    // 버튼 클릭 이벤트 연결
    attachEvents() {
        document.querySelectorAll('.nav-step-btn').forEach(btn => {
            btn.addEventListener('click', () => App.navigate(btn.dataset.page));
        });
    },

    // 현재 페이지에 해당하는 버튼 강조 표시
    updateActive(page) {
        document.querySelectorAll('.nav-step-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
    }
};

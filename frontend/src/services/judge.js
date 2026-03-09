import api from '../api/axios';

const POLL_INTERVAL = 2000;   // 2 soniya
const MAX_POLLS = 20;         // 40 soniya max

const TERMINAL_STATUSES = [
    'ACCEPTED',
    'WRONG_ANSWER',
    'TIME_LIMIT_EXCEEDED',
    'MEMORY_LIMIT_EXCEEDED',
    'RUNTIME_ERROR',
    'COMPILATION_ERROR',
    'SECURITY_VIOLATION',
    'SYSTEM_ERROR',
];

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * Kod yuborish va natijani polling qilish.
 * @param {number}   problemId      - Problem ID
 * @param {string}   language       - python|cpp|java|csharp
 * @param {string}   code           - Manba kodi
 * @param {string}   runType        - 'run' (DB tests) | 'submit' (fayl tests)
 * @param {function} onStatusUpdate - Callback: { state, runType, result?, message? }
 */
export async function submitCode({ problemId, language, code, runType = 'submit', onStatusUpdate }) {
    // 1. Submission yuborish
    onStatusUpdate({ state: 'submitting', runType });

    let submissionId;
    try {
        const { data } = await api.post('/submissions/', {
            problem: problemId,
            language,
            code,
            run_type: runType,
        });
        submissionId = data.id;
    } catch (err) {
        const errData = err.response?.data || {};
        const msg =
            errData.detail ||
            errData.problem?.[0] ||
            errData.language?.[0] ||
            errData.code?.[0] ||
            Object.values(errData)[0] ||
            'Submission yuborishda xatolik';
        onStatusUpdate({
            state: 'error',
            runType,
            message: Array.isArray(msg) ? msg[0] : String(msg),
        });
        return;
    }

    // 2. Polling boshlash
    onStatusUpdate({ state: 'running', id: submissionId, runType });

    let polls = 0;
    while (polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL);
        polls++;

        try {
            const { data } = await api.get(`/submissions/${submissionId}/`);

            // Terminal status keldi
            if (TERMINAL_STATUSES.includes(data.status)) {
                onStatusUpdate({
                    state: 'done',
                    runType,
                    result: {
                        status: data.status,
                        time_used: data.time_used || 0,
                        memory_used: data.memory_used || 0,
                        error_message: data.error_message || '',
                        failed_test: data.failed_test || null,
                        extra_data: data.extra_data || null,
                    },
                });
                return;
            }
        } catch {
            onStatusUpdate({
                state: 'error',
                runType,
                message: 'Natijani olishda xatolik',
            });
            return;
        }
    }

    onStatusUpdate({
        state: 'error',
        runType,
        message: 'Timeout: 40 soniya ichida natija kelmadi',
    });
}

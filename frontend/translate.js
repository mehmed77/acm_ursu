const fs = require('fs');
const path = require('path');

const fileList = [
    'src/components/layout/Navbar.jsx',
    'src/pages/Problems.jsx',
    'src/pages/ProblemDetail.jsx',
    'src/pages/Contests.jsx',
    'src/pages/ContestDetail.jsx',
    'src/pages/ContestScoreboard.jsx',
    'src/pages/Leaderboard.jsx',
    'src/pages/UserProfile.jsx',
    'src/pages/Status.jsx',
    'src/pages/Login.jsx',
    'src/pages/Register.jsx',
    'src/admin/pages/AdminDashboard.jsx',
    'src/admin/pages/AdminProblems.jsx',
    'src/admin/pages/AdminProblemForm.jsx',
    'src/admin/pages/AdminUsers.jsx',
    'src/admin/pages/AdminContests.jsx',
    'src/admin/pages/AdminContestForm.jsx',
    'src/admin/AdminLayout.jsx'
];

const REPLACEMENTS = {
    'Are you sure': 'Ishonchingiz komilmi',
    'This will delete': "Bu o'chirib tashlaydi",
    'Cannot be undone': "Qaytarib bo'lmaydi",
    'Confirm delete': "O'chirishni tasdiqlang",
    'Time Limit Exceeded': 'Vaqt limiti oshdi',
    'Memory Limit': 'Xotira limiti oshdi',
    'Runtime Error': 'Ishga tushish xatosi',
    'Compilation Error': 'Kompilyatsiya xatosi',
    'System Error': 'Tizim xatosi',
    'Wrong Answer': "Noto'g'ri javob",
    'Acceptance rate': 'Qabul foizi',
    'Recent submissions': "So'nggi yuborilmalar",
    'My Submissions': 'Mening yuborilmalarim',
    'Problems solved': 'Yechilgan masalalar',
    'Total penalty': 'Jami jarima vaqti',
    'Minutes from start': 'Boshlanishdan (daqiqa)',
    'Create team': 'Jamoa tuzish',
    'Join team': "Jamoaga qo'shilish",
    'Invite code': 'Taklif kodi',
    'Team name': 'Jamoa nomi',
    'Team members': "Jamoa a'zolari",
    'Max team size': "Maksimal a'zolar soni",
    'Team contest': 'Jamoaviy musobaqa',
    'Admin Panel': 'Boshqaruv paneli',
    'My Profile': 'Mening profilim',
    'Overall statistics': 'Umumiy statistika',
    'Test cases': "Sinov ma'lumotlari",
    'Select language': 'Til tanlang',
    'Add test case': "Sinov ma'lumoti qo'shish",
    'Add problem': "Masala qo'shish",
    'Edit problem': 'Masalani tahrirlash',
    'Delete problem': "Masalani o'chirish",
    'Sample test': 'Namuna sinov',
    'Hidden test': 'Yashirin sinov',
    'Active users': 'Faol foydalanuvchilar',
    'Total users': 'Jami foydalanuvchilar',
    'Total submissions': 'Jami yuborilmalar',
    'Total problems': 'Jami masalalar',
    'Solved problems': 'Yechilgan masalalar',
    'All problems': 'Barcha masalalar',
    'No problems found': 'Masala topilmadi',
    'No results found': 'Natija topilmadi',
    'No submissions yet': "Hali yuborilma yo'q",
    'Search problems': 'Masala qidirish',
    'Search users': 'Foydalanuvchi qidirish',
    'Clear filters': 'Saralashni tozalash',
    'All languages': 'Barcha tillar',
    'All statuses': 'Barcha holatlar',
    'New submissions': 'Yangi yuborilmalar',
    'Rating change': "Reyting o'zgarishi",
    'Old rating': 'Eski reyting',
    'New rating': 'Yangi reyting',
    'Rank progress': 'Reyting bosqichi',
    'Activity map': 'Faollik xaritasi',
    'Solved map': 'Yechilgan masalalar xaritasi',
    'Global rank': "Umumiy o'rin",
    'Solved count': 'Yechilgan masalalar',
    'Max rating': 'Eng yuqori reyting',
    'User not found': 'Foydalanuvchi topilmadi',
    'Full name': 'Ism familiya',
    'Quick actions': 'Tezkor amallar',
    'Input format': 'Kirish formati',
    'Output format': 'Chiqish formati',
    'Time limit': 'Vaqt limiti',
    'Problem name': 'Masala nomi',
    'Make admin': 'Admin qilish',
    'Remove admin': 'Adminlikni olish',
    'Go back': 'Orqaga',
    'Your code': 'Kodingiz',
    'Run result': 'Sinov natijasi',
    'Custom input': "O'z kirish ma'lumotim",
    'Unpublish': 'Yashirish',
    'Leaderboard': 'Reyting jadvali',
    'Rating table': 'Reyting jadvali',
    'Something went wrong': 'Xatolik yuz berdi',
    'Please try again': "Qayta urinib ko'ring",
    'Network error': 'Tarmoq xatosi',
    'Session expired': 'Sessiya tugadi',
    'Please login': 'Iltimos, kiring',
    'Access denied': 'Kirish taqiqlangan',
    'Not authorized': "Ruxsat yo'q",
    'Invalid input': "Noto'g'ri ma'lumot",
    'Field is required': "Maydon to'ldirilishi shart",
    'Password too short': 'Parol juda qisqa',
    'Passwords do not match': 'Parollar mos kelmaydi',
    'Username already taken': 'Bu foydalanuvchi nomi band',
    'Email already registered': "Bu email allaqachon ro'yxatdan o'tgan",
    'Invalid credentials': "Login yoki parol noto'g'ri",
    'Contest has ended': 'Musobaqa tugadi',
    'Not registered': "Ro'yxatdan o'tilmagan",
    'Already registered': "Allaqachon ro'yxatdan o'tildi",
    'Team is full': "Jamoa to'ldi",
    'Already in a team': 'Allaqachon jamoada siz',
    'Virtual not allowed': 'Virtual ishtirok ruxsat etilmagan',
    'Virtual only for finished': 'Virtual faqat tugagan musobaqalar uchun',
    'Time is up': 'Vaqt tugadi',
    'Code is required': 'Kod kiritilishi shart',
    'Language is required': 'Dasturlash tili tanlanishi shart',
    'My result': 'Mening natijam',
    'My rank': "Mening o'rnim",
    'Not attempted': 'Urinilmagan',
    'Starts in': 'Boshlanishiga',
    'Ends in': 'Tugashiga',

    // Single Words / Common
    'Accepted': 'Qabul qilindi',
    'Pending': 'Kutilmoqda',
    'Running': 'Tekshirilmoqda',
    'Blocked': 'Bloklangan',
    'Problems': 'Masalalar',
    'Contests': 'Musobaqalar',
    'Contest': 'Musobaqa',
    'Status': 'Holat',
    'Login': 'Kirish',
    'Register': "Ro'yxatdan o'tish",
    'Log in': 'Kirish',
    'Sign up': "Ro'yxatdan o'tish",
    'Profile': 'Profil',
    'Settings': 'Sozlamalar',
    'Logout': 'Chiqish',
    'Live': 'Jonli',
    'Upcoming': 'Kutilmoqda',
    'Finished': 'Tugadi',
    'Frozen': 'Muzlatilgan',
    'Draft': 'Qoralama',
    'Duration': 'Davomiyligi',
    'Participants': 'Ishtirokchilar',
    'Registered': "Ro'yxatdan o'tildi",
    'Start': 'Boshlanish',
    'End': 'Tugash',
    'Virtual': 'Virtual ishtirok',
    'Rated': 'Reytingli',
    'Unrated': "Reyting ta'sir qilmaydi",
    'Leader': 'Sardor',
    'Member': "A'zo",
    'Scoreboard': 'Natijalar jadvali',
    'Penalty': 'Jarima vaqti',
    'Solved': 'Yechildi',
    'Attempts': 'Urinishlar',
    'Unsolved': 'Yechilmadi',
    'Submission': 'Yuborilma',
    'Submissions': 'Yuborilmalar',
    'Submit': 'Yuborish',
    'Result': 'Natija',
    'Score': 'Ball',
    'Rank': "O'rin",
    'Change': "O'zgarish",
    'Test': 'Sinov',
    'Sample': 'Namuna',
    'Input': 'Kirish',
    'Output': 'Chiqish',
    'Examples': 'Misollar',
    'Example #1': 'Misol #1',
    'Constraints': 'Cheklovlar',
    'Description': 'Masala sharti',
    'Note': 'Izoh',
    'Editorial': 'Yechim tahlili',
    'Problem': 'Masala',
    'Difficulty': 'Daraja',
    'Easy': 'Oson',
    'Medium': "O'rta",
    'Hard': 'Qiyin',
    'Tags': 'Teglar',
    'All': 'Hammasi',
    'Filter': 'Saralash',
    'Rating': 'Reyting',
    'Joined': "Ro'yxatdan o'tgan",
    'Unknown': "Noma'lum",
    'Less': 'Kam',
    'More': "Ko'p",
    'Newbie': 'Yangi boshlagan',
    'Pupil': "O'quvchi",
    'Specialist': 'Mutaxassis',
    'Expert': 'Ekspert',
    'Candidate Master': 'Master nomzodi',
    'Master': 'Master',
    'User': 'Foydalanuvchi',
    'Username': 'Foydalanuvchi nomi',
    'Language': 'Dasturlash tili',
    'Time': 'Vaqt',
    'Memory': 'Xotira',
    'Submitted': 'Yuborilgan vaqt',
    'Run': "Sinab ko'rish",
    'Error': 'Xato',
    'Correct': "To'g'ri",
    'Wrong': "Noto'g'ri",
    'Dashboard': 'Bosh sahifa',
    'Users': 'Foydalanuvchilar',
    'Published': 'Chop etilgan',
    'Publish': 'Chop etish',
    'Save': 'Saqlash',
    'Cancel': 'Bekor qilish',
    'Back': 'Orqaga',
    'Admin': 'Administrator',
    'Block': 'Bloklash',
    'Unblock': 'Blokdan chiqarish',
    'Today': 'Bugun',
    'This week': 'Shu hafta',
    'Loading': 'Yuklanmoqda',
    'Not found': 'Topilmadi',
    'Home': 'Bosh sahifa',
    'Next': 'Keyingisi',
    'Previous': 'Oldingi',
    'Page': 'Sahifa',
    'Of': '/',
    'Total': 'Jami',
    'None': "Yo'q",
    'Yes': 'Ha',
    'No': "Yo'q",
    'Confirm': 'Tasdiqlash',
    'Delete': "O'chirish",
    'Edit': 'Tahrirlash',
    'Create': 'Yaratish',
    'Update': 'Yangilash',
    'Close': 'Yopish',
    'Open': 'Ochish',
    'Copy': 'Nusxa olish',
    'Copied': 'Nusxa olindi',
    'Share': 'Ulashish',
    'Download': 'Yuklab olish',
    'Upload': 'Yuklash',
    'Search': 'Qidirish',
    'Sort': 'Tartiblash',
    'Reset': "Qayta o'rnatish",
    'Apply': "Qo'llash",
    'Clear': 'Tozalash',
    'Select': 'Tanlash',
    'Deselect': 'Tanlovni bekor qilish',
    'Enable': 'Yoqish',
    'Disable': "O'chirish",
    'Active': 'Faol',
    'Inactive': 'Faol emas',
    'Online': 'Onlayn',
    'Offline': 'Oflayn',
    'Soon': 'Tezda',
    'Coming soon': 'Tez orada',
    'New': 'Yangi',
    'Updated': 'Yangilandi',
    'Added': "Qo'shildi",
    'Removed': "O'chirildi",
    'Saved': 'Saqlandi',
    'Deleted': "O'chirildi",
    'Success': 'Muvaffaqiyatli',
    'Failed': 'Muvaffaqiyatsiz',
    'Warning': 'Ogohlantirish',
    'Info': "Ma'lumot"
};

const DYNAMIC_REPLACEMENTS = [
    { r: /> *([0-9]+)\s+submissions *ago</gi, c: "> $1 so'nggi yuborilmalar ago<" },
    { r: />([0-9]+)\s+days ago</gi, c: ">$1 kun oldin<" },
    { r: />([0-9]+)\s+hours ago</gi, c: '>$1 soat oldin<' },
    { r: />([0-9]+)\s+minutes ago</gi, c: '>$1 daqiqa oldin<' },
    { r: />([0-9]+)\s+seconds ago</gi, c: '>$1 soniya oldin<' },
    { r: />just now</gi, c: '>hozirgina<' },
    { r: />([0-9]+)\s+points</gi, c: '>$1 ball<' },
    { r: />([0-9]+)\s+users</gi, c: '>$1 foydalanuvchi<' },
    { r: />([0-9]+)\s+problems</gi, c: '>$1 masala<' },
    { r: />([0-9]+)\s+contests</gi, c: '>$1 musobaqa<' },
];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log('Skipping Missing:', filePath);
        return;
    }
    let text = fs.readFileSync(filePath, 'utf8');

    for (const [key, val] of Object.entries(REPLACEMENTS)) {
        let regexStr = escapeRegExp(key);
        // Replace >Text<
        let regex = new RegExp('>\\s*' + regexStr + '\\s*<', 'g');
        text = text.replace(regex, '>' + val + '<');
        // Replace "Text"
        regex = new RegExp('\"' + regexStr + '\"', 'g');
        text = text.replace(regex, '\"' + val + '\"');
        // Replace 'Text'
        regex = new RegExp('\\'' + regexStr + '\\'', 'g');
        text = text.replace(regex, '\\''+val+'\\'');
        // Replace placeholder="Text"
        regex = new RegExp('placeholder=(["\\'])' + regexStr + '\\1', 'g');
        text = text.replace(regex, 'placeholder=$1' + val + '$1');
        // Replace placeholder="Text..."
        regex = new RegExp('placeholder=(["\\'])' + regexStr + '\\.\\.\\.\\1', 'g');
        text = text.replace(regex, 'placeholder=$1' + val + '...$1');
        // Replace title="Text"
        regex = new RegExp('title=(["\\'])' + regexStr + '\\1', 'g');
        text = text.replace(regex, 'title=$1' + val + '$1');
        // Replace >Text...<
        regex = new RegExp('>\\s*' + regexStr + '\\s*\\.\\.\\.<', 'g');
        text = text.replace(regex, '>' + val + '...<');
    }

    for (const { r, c } of DYNAMIC_REPLACEMENTS) {
        text = text.replace(r, c);
    }

    // Status Badges
    text = text.replace(/>\s*AC\s*</g, '>QQ<');
    text = text.replace(/✓\s*AC/g, '✓ QQ');
    text = text.replace(/>\s*WA\s*</g, '>NJ<');
    text = text.replace(/✗\s*WA/g, '✗ NJ');
    text = text.replace(/>\s*TLE\s*</g, '>VL<');
    text = text.replace(/>\s*MLE\s*</g, '>XL<');
    text = text.replace(/>\s*RE\s*</g, '>IX<');
    text = text.replace(/>\s*CE\s*</g, '>KX<');
    text = text.replace(/>\s*SE\s*</g, '>TX<');

    fs.writeFileSync(filePath, text, 'utf8');
    console.log('Translated:', filePath);
}

fileList.forEach(f => processFile(path.join('f:/UrDU/online-judge/frontend', f)));

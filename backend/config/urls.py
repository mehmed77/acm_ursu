from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.views import AdminLoginView, AdminUserListView, AdminUserUpdateView, UserProfileView
from apps.problems.views import (
    AdminDashboardView,
    AdminProblemListView, AdminProblemDetailView,
    ProblemTestCasesView, TestCaseUpdateView,
    BulkTestCaseImportView, ZipTestCaseImportView,
    AdminTagListView,
)
from apps.submissions.views import GlobalSubmissionsView, RunCodeView
from apps.contests.views import AdminContestListView, AdminContestDetailView, AdminRecalculateRatingView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/problems/', include('apps.problems.urls')),
    path('api/submissions/', include('apps.submissions.urls')),
    path('api/contests/', include('apps.contests.urls')),
    path('api/leaderboard/', include('apps.leaderboard.urls')),
    
    # Status
    path('api/status/', GlobalSubmissionsView.as_view(), name='global-status'),

    # Run
    path('api/problems/<slug:slug>/run/', RunCodeView.as_view(), name='problem-run'),

    # Custom Admin
    path('api/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('api/admin/dashboard/', AdminDashboardView.as_view()),
    path('api/admin/problems/', AdminProblemListView.as_view()),
    path('api/admin/problems/<slug:slug>/', AdminProblemDetailView.as_view()),
    path('api/admin/problems/<slug:slug>/testcases/', ProblemTestCasesView.as_view()),
    path('api/admin/problems/<slug:slug>/testcases/bulk/', BulkTestCaseImportView.as_view()),
    path('api/admin/problems/<slug:slug>/testcases/zip/', ZipTestCaseImportView.as_view()),
    path('api/admin/testcases/<int:pk>/', TestCaseUpdateView.as_view()),
    path('api/admin/tags/', AdminTagListView.as_view()),
    path('api/admin/users/', AdminUserListView.as_view()),
    path('api/admin/users/<int:pk>/', AdminUserUpdateView.as_view()),

    # Admin Contests
    path('api/admin/contests/', AdminContestListView.as_view()),
    path('api/admin/contests/<slug:slug>/', AdminContestDetailView.as_view()),
    path('api/admin/contests/<slug:slug>/recalculate-rating/', AdminRecalculateRatingView.as_view()),

    # Public Profile
    path('api/users/<str:username>/', UserProfileView.as_view()),
]

# Media fayllar uchun (faqat development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

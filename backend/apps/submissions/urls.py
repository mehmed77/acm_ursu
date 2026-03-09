from django.urls import path
from .views import (
    SubmissionCreateView,
    SubmissionDetailView,
    SubmissionCodeView,
    MySubmissionsView,
    RunTaskDetailView,
)

urlpatterns = [
    path('', SubmissionCreateView.as_view(), name='submission-create'),
    path('my/', MySubmissionsView.as_view(), name='my-submissions'),
    path('<int:pk>/', SubmissionDetailView.as_view(), name='submission-detail'),
    path('<int:pk>/code/', SubmissionCodeView.as_view(), name='submission-code'),
    path('run_status/<str:task_id>/', RunTaskDetailView.as_view(), name='run-status'),
]

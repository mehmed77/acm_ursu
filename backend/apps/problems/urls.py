from django.urls import path
from .views import (
    ProblemListView, ProblemDetailView,
    ProblemCommentsView, CommentDetailView, CommentLikeView,
    ProblemRatingView,
)
from apps.submissions.views import ProblemSubmissionsView

urlpatterns = [
    # Public endpoints
    path('', ProblemListView.as_view(), name='problem-list'),
    path('<slug:slug>/', ProblemDetailView.as_view(), name='problem-detail'),
    path('<slug:slug>/submissions/', ProblemSubmissionsView.as_view(), name='problem-submissions'),

    # Discussion
    path('<slug:slug>/comments/', ProblemCommentsView.as_view(), name='problem-comments'),
    path('comments/<int:pk>/', CommentDetailView.as_view(), name='comment-detail'),
    path('comments/<int:pk>/like/', CommentLikeView.as_view(), name='comment-like'),

    # Rating
    path('<slug:slug>/rating/', ProblemRatingView.as_view(), name='problem-rating'),
]

from django.urls import path
from .views import (
    ContestListView,
    ContestDetailView,
    ContestRegisterView,
    TeamCreateView,
    TeamJoinView,
    ContestSubmitView,
    ContestScoreboardView,
    ContestRatingView,
    MyContestSubmissionsView,
)

urlpatterns = [
    path('', ContestListView.as_view(), name='contest-list'),
    path('<slug:slug>/', ContestDetailView.as_view(), name='contest-detail'),
    path('<slug:slug>/register/', ContestRegisterView.as_view(), name='contest-register'),
    path('<slug:slug>/teams/', TeamCreateView.as_view(), name='contest-team-create'),
    path('<slug:slug>/teams/join/', TeamJoinView.as_view(), name='contest-team-join'),
    path('<slug:slug>/submit/<str:label>/', ContestSubmitView.as_view(), name='contest-submit'),
    path('<slug:slug>/scoreboard/', ContestScoreboardView.as_view(), name='contest-scoreboard'),
    path('<slug:slug>/rating/', ContestRatingView.as_view(), name='contest-rating'),
    path('<slug:slug>/my-submissions/', MyContestSubmissionsView.as_view(), name='contest-my-submissions'),
]

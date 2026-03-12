from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import News, Comment
from .serializers import NewsListSerializer, NewsDetailSerializer, CommentSerializer

class NewsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = News.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return NewsDetailSerializer
        return NewsListSerializer
        
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[])
    def comments(self, request, pk=None):
        news = self.get_object()
        
        if request.method == 'GET':
            comments = news.comments.filter(parent__isnull=True)
            page = self.paginate_queryset(comments)
            if page is not None:
                serializer = CommentSerializer(page, many=True, context={'request': request, 'news': news})
                return self.get_paginated_response(serializer.data)
                
            serializer = CommentSerializer(comments, many=True, context={'request': request, 'news': news})
            return Response(serializer.data)
            
        elif request.method == 'POST':
            if not request.user or not request.user.is_authenticated:
                return Response({'detail': "Iltimos, izoh yozish uchun tizimga kiring."}, status=status.HTTP_401_UNAUTHORIZED)
                
            serializer = CommentSerializer(data=request.data, context={'request': request, 'news': news})
            if serializer.is_valid():
                serializer.save(author=request.user, news=news)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminNewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'list':
            return NewsListSerializer
        return NewsDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

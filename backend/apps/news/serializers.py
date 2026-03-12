from rest_framework import serializers
from .models import News, Comment

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'news', 'author', 'author_username', 'author_avatar', 'text', 'parent', 'replies', 'created_at']
        read_only_fields = ['author', 'news']

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []

    def validate(self, attrs):
        news = self.context.get('news')
        request = self.context.get('request')
        
        if not news:
            raise serializers.ValidationError("News context is missing.")
            
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError({"detail": "User must be authenticated to comment."})
            
        author = request.user
        parent = attrs.get('parent')
        
        if self.instance is None:  # On Create
            user_comment_count = Comment.objects.filter(news=news, author=author).count()
            if not author.is_staff and not author.is_superuser:
                if user_comment_count >= 5:
                    raise serializers.ValidationError({"detail": "Siz ushbu yangilikka eng ko'p 5 ta izoh yoza olasiz."})
                    
            if parent and parent.news != news:
                raise serializers.ValidationError({"parent": "Parent comment does not belong to this news."})

        return super().validate(attrs)

class NewsListSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    
    class Meta:
        model = News
        fields = ['id', 'title', 'image', 'author_username', 'views_count', 'comments_count', 'created_at']

class NewsDetailSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    comments = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)

    class Meta:
        model = News
        fields = ['id', 'title', 'content', 'image', 'author_username', 'views_count', 'comments_count', 'created_at', 'comments']
        
    def get_comments(self, obj):
        top_level_comments = obj.comments.filter(parent__isnull=True)
        return CommentSerializer(top_level_comments, many=True, context=self.context).data

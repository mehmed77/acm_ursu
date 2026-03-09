from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT login serializer.
    JWT token bilan birga username, rating, solved_count ham qaytaradi.
    """

    def validate(self, attrs):
        data = super().validate(attrs)

        # Token bilan birga user ma'lumotlarini qo'shamiz
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'rating': self.user.rating,
            'solved_count': self.user.solved_count,
            'is_hemis_user': getattr(self.user, 'is_hemis_user', False),
        }

        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Ro'yxatdan o'tish serializeri."""
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Parollar mos kelmadi."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        # Avtomatik profil yaratish
        UserProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Foydalanuvchi ma'lumotlari serializeri."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'rating', 'solved_count')
        read_only_fields = ('id', 'rating', 'solved_count')


class UserProfileSerializer(serializers.ModelSerializer):
    """Foydalanuvchi profili serializeri."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ('user', 'bio', 'country', 'avatar', 'created_at', 'updated_at')
        read_only_fields = ('created_at', 'updated_at')

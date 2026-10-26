from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from apps.users.models import User
from ..models import Tutorial, TutorialCategory, TutorialAudience, TutorialProgress
from ..serializers import TutorialSerializer, normalize_video
from rest_framework.exceptions import ValidationError

class TutorialTests(TestCase):
    def setUp(self):
        self.admin = self.user('platform', 'PLATFORM_ADMIN')
        self.owner = self.user('owner', 'ADMIN')
        self.other = self.user('other', 'STAFF')
        self.category = TutorialCategory.objects.create(name='Cases', slug='cases')
        self.video = Tutorial.objects.create(title='Managing cases', slug='cases', category=self.category, video_reference='M7lc1UVf-VE', duration=100, status='published')
        self.client = APIClient()
    def user(self, name, role):
        return User.objects.create_user(email=f'{name}@example.test', password='test', first_name=name, last_name='Test', national_id_number=name, phone_number=name, role=role)
    def login(self, user):
        self.client.force_authenticate(user)
    def test_auth_and_publication_permissions(self):
        self.assertEqual(self.client.get('/api/tutorials/').status_code, 401)
        self.login(self.owner)
        self.assertEqual(self.client.patch(f'/api/tutorials/{self.video.pk}/', {'status':'draft'}).status_code, 403)
        self.video.status = 'draft'; self.video.save()
        self.assertEqual(self.client.get(f'/api/tutorials/{self.video.pk}/').status_code, 404)
        self.login(self.admin)
        self.assertEqual(self.client.patch(f'/api/tutorials/{self.video.pk}/?manage=1', {'status':'published'}).status_code, 200)
    def test_create_and_chapter_validation(self):
        self.login(self.admin)
        payload = dict(title='Introduction', slug='intro', category=str(self.category.pk), video_reference='https://youtu.be/M7lc1UVf-VE', duration=100, chapters=[dict(title='Start', start=0, display_order=0),dict(title='Next', start=40, display_order=1)])
        response = self.client.post('/api/tutorials/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        payload['slug']='bad'; payload['chapters'][1]['start']=101
        self.assertEqual(self.client.post('/api/tutorials/', payload, format='json').status_code, 400)
        for start, end in [(-1,None),(20,10),(100,None)]:
            serializer = TutorialSerializer(self.video, data={'chapters':[{'title':'Invalid','start':start,'end':end}]}, partial=True)
            self.assertFalse(serializer.is_valid())
    def test_audience_and_search_are_filtered(self):
        TutorialAudience.objects.create(tutorial=self.video, role='ADMIN')
        self.login(self.other)
        self.assertEqual(self.client.get('/api/tutorials/?search=cases').data['count'], 0)
        self.assertEqual(self.client.get(f'/api/tutorials/{self.video.pk}/chapters/').status_code, 404)
        self.login(self.owner)
        self.assertEqual(self.client.get('/api/tutorials/?search=cases').data['count'], 1)
        self.video.chapters.create(title='Filing', start=10)
        self.assertEqual(self.client.get('/api/tutorials/?search=Filing').data['count'], 1)
    def test_progress_ownership_and_seek_not_completion(self):
        self.login(self.owner)
        url=f'/api/tutorials/{self.video.pk}/progress/'
        response=self.client.post(url, {'position':100}, format='json')
        self.assertEqual(response.status_code,200)
        self.assertFalse(response.data['completed'])
        self.assertEqual(response.data['percentage'],0)
        self.login(self.other)
        self.assertIsNone(self.client.get(url).data)
        self.assertEqual(self.client.get('/api/tutorials/progress/').data['count'],0)
        self.client.post(url, {'position':20,'ranges':[[0,20]], 'user':str(self.owner.pk)}, format='json')
        self.assertEqual(TutorialProgress.objects.get(user=self.owner).position,100)
        self.assertEqual(TutorialProgress.objects.get(user=self.other).percentage,20)
    def test_invalid_sources(self):
        for value in ['javascript:alert(1)','https://evil.test/watch?v=M7lc1UVf-VE','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','http://youtu.be/M7lc1UVf-VE']:
            with self.assertRaises(ValidationError): normalize_video('youtube',value)
        with self.assertRaises(ValidationError): normalize_video('html5','https://evil.test/video.mp4')
        with override_settings(TUTORIAL_VIDEO_HOSTS=['media.example.test']):
            self.assertEqual(normalize_video('html5','https://media.example.test/video.mp4'),'https://media.example.test/video.mp4')
    def test_cross_firm_progress_and_membership_audiences(self):
        from apps.firm.models import LawFirm, LawFirmMember
        firms = [LawFirm.objects.create(owner=[self.owner,self.other][i],name=f'Fictional firm {i}',registration_number=f'tutorial-test-{i}',email=f'firm{i}@example.test') for i in range(2)]
        LawFirmMember.objects.create(firm=firms[0],user=self.owner,role='LAWYER')
        member = LawFirmMember.objects.create(firm=firms[1],user=self.other,role='SECRETARY')
        TutorialAudience.objects.create(tutorial=self.video,firm_role='LAWYER')
        self.login(self.owner)
        self.assertEqual(self.client.get(f'/api/tutorials/{self.video.pk}/').status_code,200)
        self.client.post(f'/api/tutorials/{self.video.pk}/progress/', {'position':20,'ranges':[[0,20]]},format='json')
        self.login(self.other)
        self.assertEqual(self.client.get(f'/api/tutorials/{self.video.pk}/').status_code,404)
        self.assertEqual(self.client.get('/api/tutorials/progress/?user='+str(self.owner.pk)).data['count'],0)
        member.role='LAWYER';member.save()
        self.assertIsNone(self.client.get(f'/api/tutorials/{self.video.pk}/progress/').data)
        member.is_active=False;member.save()
        self.assertEqual(self.client.get(f'/api/tutorials/{self.video.pk}/').status_code,404)
    def test_editor_preserves_progress_and_source_change_resets_it(self):
        TutorialProgress.objects.create(user=self.owner,tutorial=self.video,position=15)
        self.login(self.admin)
        url=f'/api/tutorials/{self.video.pk}/?manage=1'
        self.assertEqual(self.client.patch(url,{'title':'Updated'}).status_code,200)
        self.assertTrue(TutorialProgress.objects.filter(user=self.owner).exists())
        self.assertEqual(self.client.patch(url,{'video_reference':'abcdefghijk'}).status_code,200)
        self.assertFalse(TutorialProgress.objects.filter(user=self.owner).exists())
    def test_completion_merges_actual_activity_and_rejects_bulk_claim(self):
        from datetime import timedelta
        from django.utils import timezone
        self.login(self.owner)
        url=f'/api/tutorials/{self.video.pk}/progress/'
        self.assertEqual(self.client.post(url,{'position':100,'ranges':[[0,100]]},format='json').status_code,400)
        for a,b in [(0,25),(25,50),(50,75),(75,95)]:
            TutorialProgress.objects.filter(user=self.owner).update(updated_at=timezone.now()-timedelta(seconds=30))
            response=self.client.post(url,{'position':b,'ranges':[[a,b]]},format='json')
            self.assertEqual(response.status_code,200,response.data)
        self.assertTrue(response.data['completed'])
        self.assertEqual(response.data['percentage'],95)
    def test_recommendations_never_retrieve_restricted_content(self):
        from ..services import recommend_tutorials
        self.video.chapters.create(title='Filing',start=10)
        self.assertEqual(recommend_tutorials(user=self.owner,query='Filing')[0]['timestamp'],10)
        self.video.status='draft';self.video.save()
        self.assertEqual(recommend_tutorials(user=self.owner,query='Filing'),[])
    def test_category_write_and_invalid_filter(self):
        self.login(self.owner)
        self.assertEqual(self.client.post('/api/tutorials/categories/',{'name':'Test','slug':'test'}).status_code,403)
        self.assertEqual(self.client.get('/api/tutorials/?category=invalid').status_code,400)

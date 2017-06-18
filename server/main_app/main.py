import sys
sys.path.insert(0, 'libs')
from requests_toolbelt.adapters import appengine
appengine.monkeypatch()
import base64
import cognitive_face as CF
import json
import logging
import time
import webapp2
from google.appengine.ext import ndb
from transfer import transfer

ENDPOINT = 'http://postbankserver.appspot.com'
REFERENCE_IMAGE_KEY = 'REFERENCE_IMAGE_KEY'
VERIFY_IMAGE_KEY = 'VERIFY_IMAGE_KEY'

API_KEY = 'eb110caa2e1f473ba0895560b813c0c7'
CF.Key.set(API_KEY)


def image_key(key):
    return ndb.Key('Image', key)


class Image(ndb.Model):
    value = ndb.StringProperty(indexed=False)


def get_face_id(url):
    logging.info(url)
    result = CF.face.detect(url)
    logging.info(result)
    return result[0]['faceId']


def verify_face(face_id1, face_id2):
    return CF.face.verify(face_id=face_id1, another_face_id=face_id2)


def set_image(value, key=VERIFY_IMAGE_KEY):
    image_query = Image.query(ancestor=image_key(key))
    images = image_query.fetch(100)
    for image in images:
        image.key.delete()
    image = Image(parent=image_key(key))
    image.value = value
    image.put()


def get_image(key):
    image_query = Image.query(ancestor=image_key(key))
    images = image_query.fetch(100)
    if len(images) > 0:
        return images[0].value
    else:
        return "No image found"


class VerifyPage(webapp2.RequestHandler):
    def post(self):
        image = self.request.get('image')
        logging.info('Verify Image: ' + image[:100])
        set_image(image, key=VERIFY_IMAGE_KEY)
        logging.info('Saved Verify Image: ' + get_image(key=VERIFY_IMAGE_KEY)[:100])

        reference_image = ENDPOINT + '/reference_image.jpg?timestamp=' + str(time.time())
        verify_image = ENDPOINT + '/verify_image.jpg?timestamp=' + str(time.time())
        face_id1 = get_face_id(reference_image)
        face_id2 = get_face_id(verify_image)
        self.response.write(json.dumps(verify_face(face_id1, face_id2)))


class ReferencePage(webapp2.RequestHandler):
    def post(self):
        image = self.request.get('image')
        logging.info('Reference Image: ' + image[:100])
        set_image(image, key=REFERENCE_IMAGE_KEY)
        logging.info('Saved Reference Image: ' + get_image(key=REFERENCE_IMAGE_KEY)[:100])
        self.response.write('{"isIdentical": true, "confidence": 1.0}')


class VerifyImagePage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'image/jpeg'
        self.response.write(base64.decodestring(get_image(key=VERIFY_IMAGE_KEY)))


class ReferenceImagePage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'image/jpeg'
        self.response.write(base64.decodestring(get_image(key=REFERENCE_IMAGE_KEY)))


class TransferPage(webapp2.RequestHandler):
    def get(self):
        self.response.write(transfer())


class TestPage(webapp2.RequestHandler):
    def get(self):
        stephan1 = 'http://postbankserver.appspot.com/reference_image.jpg'
        face_id1 = get_face_id(stephan1)
        stephan2 = 'http://postbankserver.appspot.com/verify_image.jpg'
        face_id2 = get_face_id(stephan2)
        self.response.write(json.dumps(verify_face(face_id1, face_id2)))


class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, Friend.')

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/test', TestPage),
    ('/reference', ReferencePage),
    ('/verify', VerifyPage),
    ('/reference_image.jpg', ReferenceImagePage),
    ('/verify_image.jpg', VerifyImagePage),
    ('/transfer', TransferPage)
], debug=True)

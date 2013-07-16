#coding: utf-8

import re
import json

import requests
from pyquery import PyQuery as pq
from redis import StrictRedis
redis = StrictRedis()


REDIS_KEY = 'schedge:timeline:biology'
YEAR = 365.2425

def getEvents():
  url = 'http://en.wikipedia.org/wiki/Timeline_of_biology_and_organic_chemistry'
  r = requests.get(url)
  if not r.ok:
    print 'Error: %s' % r.text
    return

  redis.delete(REDIS_KEY)
  pattern = ur'\s*(?P<year_rep>(?P<circa>c\.)?\s*((?P<year>\d+)|.+)(?P<bc>\s*BCE?)?)\s*—\s*(?P<description>.+)'
  for element in pq(r.text).find('#mw-content-text > ul > li'):
    html = pq(element).html()

    matches = re.match(pattern, html, re.UNICODE)
    if not matches:
      print 'Failed to match pattern: %s' % html
      continue
    
    match = matches.groupdict()
    abs_description = re.sub(r'/wiki/', 'http://en.wikipedia.org/wiki/', match['description'])
    event = dict(description=abs_description, year=match['year_rep'])

    if match['year']:
      event['median'] = int(match['year']) if not match['bc'] else int(match['year']) * -1 + 1
      event['resolution'] = YEAR if not match['circa'] else 5 * YEAR
    else:
      if 'Naturalis' in match['description']:
        event['median'] = 60
        event['resolution'] = 20 * YEAR
      elif 'Galen' in match['description']:
        event['median'] = 165
        event['resolution'] = 70 * YEAR
      elif 'Jan Baptist van Helmont' in match['description']:
        event['median'] = 1625
        event['resolution'] = 20 * YEAR

    redis.sadd(REDIS_KEY, json.dumps(event))


if __name__ == '__main__':
  getEvents()


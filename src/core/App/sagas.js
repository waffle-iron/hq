/* eslint no-constant-condition: ["error", { "checkLoops": false }] */

import { browserHistory } from 'react-router';
import { takeLatest } from 'redux-saga';
import { call, put, spawn, select } from 'redux-saga/effects';
import { flatten } from 'ramda';
import { get, post, remove } from 'web/utils/request';
import { endpoints, components } from 'core/config/endpoints';
import { selectGlobal } from './selectors';

import {
  SET_CURRENT_USER,
  SET_CATEGORIES,
  CREATE_CATEGORY,
  CATEGORY_CREATED,
  CREATE_SECTION,
  SECTION_CREATED,
  DELETE_SECTION,
  SECTION_DELETED,
  SCROLL_TO_SECTION
} from './constants';

export function* fetchCurrentUser() {
  try {
    const response = yield call(get, endpoints.currentUser);

    return response;
  } catch (error) {
    return false;
  }
}

export function* fetchCategories() {
  try {
    const response = yield call(get, `${endpoints.categories}?includes=sections`);

    return response;
  } catch (error) {
    return false;
  }
}

export function* fetchComponent(sectionId) {
  try {
    const componentsUrl = yield call(components, sectionId);
    const response = yield call(get, componentsUrl);

    return response;
  } catch (error) {
    return false;
  }
}

export function* fetchCurrentUserFlow() {
  const { data } = yield call(fetchCurrentUser);

  if (data) {
    yield put({ type: SET_CURRENT_USER, currentUser: data });
  }
}

export function* fetchCategoriesFlow() {
  const { data: categories } = yield call(fetchCategories);

  if (categories) {
    const allcomponents = yield categories.map((category) =>
      category.sections.map((section) => call(fetchComponent, section.id)));

    yield put({ type: SET_CATEGORIES, categories, components: flatten(allcomponents) });
  }
}

export function* createCategory({ title }) {
  const state = yield select(selectGlobal());
  const categories = state.get('categories');

  const {
    data: category
  } = yield call(
    post, endpoints.categories,
    { body: { title, order: categories.size } }
  );

  if (category) {
    yield put({ type: CATEGORY_CREATED, category });
  }
}

export function* createSection({ category, title }) {
  const sections = category.sections;
  const categoryId = category.id;
  const {
    data: section
  } = yield call(
    post, `${endpoints.categories}/${categoryId}/sections`,
    { body: { title, order: sections.size, categoryId } }
  );

  if (section) {
    const sectionId = section.id;
    yield put({ type: SECTION_CREATED, category, section });
    yield put({ type: SCROLL_TO_SECTION, sectionId });
  }
}

export function* deleteSection({ category, sectionId }) {
  const categoryId = category.id;
  yield call(remove, `${endpoints.categories}/${categoryId}/sections/${sectionId}`);
  yield put({ type: SECTION_DELETED, category, sectionId });
}

export function* root() {
  yield call(fetchCurrentUserFlow);
  yield call(fetchCategoriesFlow);
  yield spawn(takeLatest, CREATE_CATEGORY, createCategory);
  yield spawn(takeLatest, CREATE_SECTION, createSection);
  yield spawn(takeLatest, DELETE_SECTION, deleteSection);
}

export function forwardTo(location) {
  browserHistory.push(location);
}

export function hardRefresh() {
  window.location = '/login';
}

export default [
  root
];

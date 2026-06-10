import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodes, ErrorMessages } from './errors';
import { Capabilities, roleHasCapability, Roles } from './roles';

describe('AppError', () => {
  it('기본 한국어 메시지와 상태 코드를 가진다', () => {
    const err = new AppError(ErrorCodes.FORBIDDEN);
    expect(err.message).toBe(ErrorMessages.FORBIDDEN);
    expect(err.status).toBe(403);
    expect(err.toJSON()).toEqual({
      code: 'FORBIDDEN',
      message: '이 작업을 수행할 권한이 없습니다.',
      details: undefined,
    });
  });

  it('커스텀 메시지를 지원한다', () => {
    const err = new AppError(ErrorCodes.NOT_FOUND, { message: '문서를 찾을 수 없습니다.' });
    expect(err.message).toBe('문서를 찾을 수 없습니다.');
    expect(err.status).toBe(404);
  });
});

describe('roleHasCapability', () => {
  it('VIEWER는 문서 수정 권한이 없다', () => {
    expect(roleHasCapability(Roles.VIEWER, Capabilities.EDIT_DOCUMENTS)).toBe(false);
    expect(roleHasCapability(Roles.VIEWER, Capabilities.VIEW_DOCUMENTS)).toBe(true);
  });

  it('EDITOR는 AI 사용과 문서 수정이 가능하지만 지식 승인은 불가하다', () => {
    expect(roleHasCapability(Roles.EDITOR, Capabilities.USE_AI)).toBe(true);
    expect(roleHasCapability(Roles.EDITOR, Capabilities.EDIT_DOCUMENTS)).toBe(true);
    expect(roleHasCapability(Roles.EDITOR, Capabilities.APPROVE_KNOWLEDGE)).toBe(false);
  });

  it('KNOWLEDGE_REVIEWER는 지식 승인이 가능하다', () => {
    expect(roleHasCapability(Roles.KNOWLEDGE_REVIEWER, Capabilities.APPROVE_KNOWLEDGE)).toBe(true);
  });
});

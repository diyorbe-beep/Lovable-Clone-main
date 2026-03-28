import { validateInput, sanitizeInput, validateFileUpload } from '@/lib/security/validation';
import { 
  createProjectSchema, 
  createMessageSchema, 
  generateComponentSchema,
  updateUserSchema 
} from '@/lib/security/validation';

describe('Security Validation', () => {
  describe('validateInput', () => {
    it('should validate valid project data', () => {
      const validData = { name: 'Test Project' };
      const result = validateInput(createProjectSchema, validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid project data', () => {
      const invalidData = { name: '' };
      const result = validateInput(createProjectSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate valid message data', () => {
      const validData = { 
        content: 'Hello world', 
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'RESULT' as const 
      };
      const result = validateInput(createMessageSchema, validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject message data with invalid UUID', () => {
      const invalidData = { 
        content: 'Hello world', 
        projectId: 'invalid-uuid',
        type: 'RESULT' as const 
      };
      const result = validateInput(createMessageSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('projectId: Invalid ID format');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      
      expect(result).toBe('alert("xss")Hello');
    });

    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);
      
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")Hello';
      const result = sanitizeInput(input);
      
      expect(result).toBe('Hello');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      
      expect(result).toBe('Hello World');
    });
  });

  describe('validateFileUpload', () => {
    it('should validate allowed file types', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject oversized files', () => {
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join(''); // 11MB
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File size exceeds 10MB limit');
    });

    it('should reject disallowed file types', () => {
      const file = new File(['content'], 'malware.exe', { type: 'application/octet-stream' });
      const result = validateFileUpload(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File type not allowed');
    });
  });

  describe('Schema Validation', () => {
    it('should validate component generation schema', () => {
      const validData = {
        prompt: 'Create a button component',
        framework: 'react' as const,
        styling: 'tailwind' as const,
        typescript: true
      };
      const result = validateInput(generateComponentSchema, validData);
      
      expect(result.success).toBe(true);
    });

    it('should validate user update schema with partial data', () => {
      const validData = { name: 'John Doe' };
      const result = validateInput(updateUserSchema, validData);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email in user update', () => {
      const invalidData = { email: 'invalid-email' };
      const result = validateInput(updateUserSchema, invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('email: Invalid email format');
    });
  });
});

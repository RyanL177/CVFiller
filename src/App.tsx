import { useState, useRef, useEffect } from 'react';
import { Layout, Button, Card, Input, Textarea, Space, Tag, Dialog, MessagePlugin } from 'tdesign-react';
import { UploadIcon, FileIcon, EditIcon, CopyIcon, DownloadIcon, CheckCircleIcon, InfoCircleIcon, LightbulbIcon, ThumbUpIcon, ErrorCircleIcon, UserIcon, LockOnIcon, LogoutIcon } from 'tdesign-icons-react';
// @ts-ignore - 变量在 JSX 中使用但 TypeScript 检测不到
import 'tdesign-react/dist/tdesign.css';
import './App.css';

const { Header, Content, Footer } = Layout;

// 用户认证相关类型
interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

// API 配置 - 使用相对路径，通过 Vite 代理转发到后端
const API_BASE_URL = '';

interface ResumeInfo {
  name: string;
  email: string;
  phone: string;
  education: string;
  experience: string;
  campusExperience: string;
  skills: string;
}

interface ResumeAdvice {
  score: number;
  summary: string;
  strengths: string[];
  improvements: {
    section: string;
    issue: string;
    suggestion: string;
  }[];
  action_items: string[];
}

const emptyResumeInfo: ResumeInfo = {
  name: '',
  email: '',
  phone: '',
  education: '',
  experience: '',
  campusExperience: '',
  skills: '',
};

const labels: Record<keyof ResumeInfo, string> = {
  name: '姓名',
  email: '邮箱',
  phone: '电话',
  education: '教育背景',
  experience: '工作/项目经历',
  campusExperience: '校园经历',
  skills: '技能',
};

function App() {
  const [extractedInfo, setExtractedInfo] = useState<ResumeInfo>(emptyResumeInfo);
  const [editInfo, setEditInfo] = useState<ResumeInfo>(emptyResumeInfo);
  const [hasFile, setHasFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [advice, setAdvice] = useState<ResumeAdvice | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [showAdviceDialog, setShowAdviceDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 用户认证状态
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cvfiller_token'));
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null);

  const showNotification = (title: string, content: string, theme: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    // 降级为控制台输出，避免 TDesign Notification 组件错误
    console.log(`[${theme}] ${title}: ${content}`);
    MessagePlugin[theme](content);
    // 可选：使用浏览器原生通知
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: content });
    }
  };

  // ========== 用户认证相关函数 ==========

  // 检查登录状态
  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setCurrentUser(result.user);
      } else {
        // Token 无效，清除登录状态
        handleLogout();
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      showNotification('提示', '请填写邮箱和密码', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const result = await response.json();

      if (response.ok) {
        setToken(result.access_token);
        setCurrentUser(result.user);
        localStorage.setItem('cvfiller_token', result.access_token);
        setShowLoginDialog(false);
        setLoginForm({ email: '', password: '' });
        showNotification('成功', '登录成功！', 'success');
      } else {
        showNotification('错误', result.detail || '登录失败', 'error');
      }
    } catch (error) {
      showNotification('错误', '网络错误，请重试', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username || !registerForm.email || !registerForm.password) {
      showNotification('提示', '请填写完整信息', 'warning');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showNotification('提示', '两次输入的密码不一致', 'warning');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        setToken(result.access_token);
        setCurrentUser(result.user);
        localStorage.setItem('cvfiller_token', result.access_token);
        setShowRegisterDialog(false);
        setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
        showNotification('成功', '注册成功！', 'success');
      } else {
        showNotification('错误', result.detail || '注册失败', 'error');
      }
    } catch (error) {
      showNotification('错误', '网络错误，请重试', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('cvfiller_token');
    showNotification('提示', '已退出登录', 'info');
  };

  // 保存简历到用户账户
  const handleSaveToAccount = async () => {
    if (!currentUser) {
      setShowLoginDialog(true);
      showNotification('提示', '请先登录', 'warning');
      return;
    }

    try {
      const url = currentResumeId 
        ? `${API_BASE_URL}/api/resumes/${currentResumeId}`
        : `${API_BASE_URL}/api/resumes`;
      const method = currentResumeId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editInfo)
      });

      const result = await response.json();

      if (response.ok) {
        if (!currentResumeId && result.id) {
          setCurrentResumeId(result.id);
        }
        showNotification('成功', '简历已保存到您的账户', 'success');
      } else {
        showNotification('错误', result.detail || '保存失败', 'error');
      }
    } catch (error) {
      showNotification('错误', '保存失败，请重试', 'error');
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      showNotification('错误', '请上传 PDF 或 Word 格式的文件', 'error');
      return;
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('错误', '文件大小不能超过 10MB', 'error');
      return;
    }

    // 保存文件到 state（在清空 input 之前）
    // 检查是否登录
    if (!token) {
      showNotification('提示', '请先登录后再上传简历', 'warning');
      setShowLoginDialog(true);
      return;
    }

    setUploadedFile(file);

    setIsUploading(true);
    showNotification('提示', '正在上传并解析简历，请稍候...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/parse-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.parsed_data) {
        // 将后端返回的数据映射到前端格式
        const data = result.parsed_data;
        
        // 改进数据提取逻辑，确保信息完整
        const mappedData: ResumeInfo = {
          name: data.personal_info?.name || data.name || '',
          email: data.personal_info?.email || data.email || '',
          phone: data.personal_info?.phone || data.phone || '',
          education: data.education?.map((edu: any) => {
            const school = edu.school || edu.institution || edu.university || '';
            const major = edu.major || edu.field || edu.specialty || '';
            const degree = edu.degree || edu.level || '';
            const start = edu.start_date || edu.start || edu.from || '';
            const end = edu.end_date || edu.end || edu.to || '至今';
            return `${school} ${major} ${degree} ${start}-${end}`.trim();
          }).join('\n\n') || data.education_text || '',
          experience: [
            ...(data.work_experience || []).map((work: any) => {
              const company = work.company || work.organization || work.employer || '';
              const position = work.position || work.title || work.role || '';
              const start = work.start_date || work.start || work.from || '';
              const end = work.end_date || work.end || work.to || '至今';
              // 优先使用完整描述，支持多种字段名
              let desc = work.description || work.details || work.content || work.summary || '';
              // 如果有 achievements 数组，也添加进去
              if (work.achievements && Array.isArray(work.achievements) && work.achievements.length > 0) {
                desc += '\n\n主要成就：\n' + work.achievements.map((a: string) => '• ' + a).join('\n');
              }
              // 如果有 tech_stack 技术栈，也添加进去
              if (work.tech_stack && Array.isArray(work.tech_stack) && work.tech_stack.length > 0) {
                desc += '\n\n技术栈：' + work.tech_stack.join('、');
              }
              return `${company} | ${position} | ${start} - ${end}\n${desc}`.trim();
            }),
            ...(data.projects || []).map((proj: any) => {
              const name = proj.name || proj.project_name || proj.title || '';
              const role = proj.role || proj.position || '项目成员';
              const start = proj.start_date || proj.start || proj.from || '';
              const end = proj.end_date || proj.end || proj.to || '';
              // 优先使用完整描述，支持多种字段名
              let desc = proj.description || proj.details || proj.content || proj.summary || '';
              // 如果有 achievements 数组，也添加进去
              if (proj.achievements && Array.isArray(proj.achievements) && proj.achievements.length > 0) {
                desc += '\n\n主要成就：\n' + proj.achievements.map((a: string) => '• ' + a).join('\n');
              }
              // 如果有 tech_stack 技术栈，也添加进去
              if (proj.tech_stack && Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0) {
                desc += '\n\n技术栈：' + proj.tech_stack.join('、');
              }
              return `项目：${name} | ${role} | ${start} - ${end}\n${desc}`.trim();
            })
          ].filter(Boolean).join('\n\n\n') || data.experience_text || '',
          campusExperience: data.campus_experience?.map((campus: any) => {
            const org = campus.organization || campus.org || campus.department || '';
            const role = campus.role || campus.position || campus.title || '';
            const start = campus.start_date || campus.start || campus.from || '';
            const end = campus.end_date || campus.end || campus.to || '至今';
            const desc = campus.description || campus.details || campus.content || '';
            return `${org} | ${role} | ${start} - ${end}\n${desc}`.trim();
          }).join('\n\n\n') || data.campus_experience_text || '',
          skills: data.skills_certifications?.skills?.join('\n') || 
                  data.skills?.join('\n') || 
                  data.skill_text || '', 
        };
        
        setExtractedInfo(mappedData);
        setEditInfo(mappedData);
        setHasFile(true);
        showNotification('成功', '简历解析完成！', 'success');
      } else {
        throw new Error(result.detail || '解析失败');
      }
    } catch (error) {
      console.error('上传错误:', error);
      showNotification('错误', error instanceof Error ? error.message : '上传失败，请重试', 'error');
    } finally {
      setIsUploading(false);
      // 清空 input 以便可以再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = () => {
    setExtractedInfo(editInfo);
    showNotification('成功', '保存成功！');
  };

  const handleGetAdvice = async () => {
    // 如果已经有建议，直接打开弹窗
    if (advice) {
      setShowAdviceDialog(true);
      return;
    }

    // 检查是否登录
    if (!token) {
      showNotification('提示', '请先登录后再获取简历建议', 'warning');
      setShowLoginDialog(true);
      return;
    }

    // 检查是否有上传的文件
    if (!uploadedFile) {
      showNotification('提示', '请先上传简历文件', 'warning');
      return;
    }

    setIsLoadingAdvice(true);
    showNotification('提示', '正在分析简历，请稍候...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${API_BASE_URL}/api/resume-advice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`获取建议失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.advice) {
        setAdvice(result.advice);
        setShowAdviceDialog(true);
        showNotification('成功', '简历分析完成！', 'success');
      } else {
        throw new Error(result.detail || '分析失败');
      }
    } catch (error) {
      console.error('获取建议错误:', error);
      showNotification('错误', error instanceof Error ? error.message : '获取建议失败', 'error');
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(editInfo, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'resume-info.json';
    link.click();
    showNotification('成功', '导出成功！');
  };

  const handleCopyToClipboard = async () => {
    const text = Object.entries(editInfo)
      .filter(([key, value]) => value && value.trim() !== '')
      .map(([key, value]) => `${labels[key as keyof ResumeInfo]}:\n${value}`)
      .join('\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      showNotification('成功', '已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
      // 回退方案：使用传统方法
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showNotification('成功', '已复制到剪贴板！');
      } catch (e) {
        showNotification('错误', '复制失败，请手动复制', 'error');
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
      {/* File input 放在最外层，确保始终可访问 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
      />
      
      <Layout className="relative min-h-screen">
        <Header className="bg-white/70 backdrop-blur-md border-b border-white/50 px-6 md:px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileIcon size="24px" className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">CVFiller</h1>
              <p className="text-xs md:text-sm text-gray-500 hidden md:block">智能简历提取助手</p>
            </div>
          </div>
          
          {/* 用户认证区域 */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden md:block">
                  欢迎，{currentUser.username}
                </span>
                <Button
                  theme="default"
                  variant="outline"
                  size="small"
                  icon={<LogoutIcon />}
                  onClick={handleLogout}
                >
                  退出
                </Button>
              </div>
            ) : (
              <Space>
                <Button
                  theme="primary"
                  variant="outline"
                  size="small"
                  icon={<UserIcon />}
                  onClick={() => setShowLoginDialog(true)}
                >
                  登录
                </Button>
                <Button
                  theme="primary"
                  size="small"
                  onClick={() => setShowRegisterDialog(true)}
                >
                  注册
                </Button>
              </Space>
            )}
          </div>
        </Header>

        <Content className="p-4 md:p-8">
          {!hasFile ? (
            <div className="max-w-5xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-3xl overflow-hidden">
                <div className="relative bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-8 md:p-16 text-center text-white">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative">
                    {/* <UploadIcon size="64px" className="mb-4 md:mb-6 text-white/90" /> */}
                    <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 tracking-tight">智能简历处理</h2>
                    <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
                      AI 自动提取信息，一键填写网申表格
                    </p>
                  </div>
                </div>
                
                <div className="p-8 md:p-12">
                  <div className="mb-8 md:mb-12 text-center">
                    <Button 
                      size="large" 
                      theme="primary" 
                      variant="base"
                      onClick={handleFileSelect}
                      loading={isUploading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-5 rounded-2xl text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <UploadIcon size="28px" />
                        <span>{isUploading ? '正在解析...' : '上传简历文件 (PDF / Word)'}</span>
                      </div>
                    </Button>
                    <p className="text-center text-gray-500 text-sm mt-4">
                      支持 PDF、DOC、DOCX 格式，文件大小不超过 10MB
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/30 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                        <CheckCircleIcon size="24px" className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">智能提取</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        基于 AI 技术，精准识别并提取简历中的姓名、联系方式、教育背景、工作经历等关键信息
                      </p>
                    </div>

                    <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/30 hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 transform hover:-translate-y-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                        <EditIcon size="24px" className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">便捷编辑</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        在线编辑校对提取的信息，确保内容准确无误，支持实时预览修改效果
                      </p>
                    </div>

                    <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/30 hover:shadow-xl hover:shadow-green-100/50 transition-all duration-300 transform hover:-translate-y-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                        <InfoCircleIcon size="24px" className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">快速导出</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        支持导出 JSON 格式或一键复制到剪贴板，快速填写各类网申表格
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-3xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 md:px-8 py-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <FileIcon size="24px" className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">简历信息管理</h2>
                        <p className="text-white/80 text-sm">提取结果预览与编辑</p>
                      </div>
                    </div>
                    
                    <Space className="flex flex-wrap">
                      <Button
                        theme="default"
                        onClick={() => {
                          setHasFile(false);
                          setIsEditing(false);
                          setExtractedInfo(emptyResumeInfo);
                          setEditInfo(emptyResumeInfo);
                          setUploadedFile(null);
                          setAdvice(null);
                          setShowAdviceDialog(false);
                        }}
                        className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                      >
                        ← 返回
                      </Button>
                      <Button 
                        theme="default" 
                        icon={<UploadIcon />}
                        onClick={() => {
                          setIsEditing(false);
                          handleFileSelect();
                        }}
                        className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                      >
                        重新上传
                      </Button>
                      <Button 
                        theme="default" 
                        icon={<CopyIcon />}
                        onClick={handleCopyToClipboard}
                        className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30"
                      >
                        复制全部
                      </Button>
                      <Button 
                        theme="success" 
                        icon={<DownloadIcon />}
                        onClick={handleExportJSON}
                        className="bg-white text-blue-600 hover:bg-white/90 shadow-lg"
                      >
                        导出 JSON
                      </Button>
                      <Button 
                        theme="warning" 
                        icon={<LightbulbIcon />}
                        loading={isLoadingAdvice}
                        onClick={handleGetAdvice}
                        className="bg-yellow-400 text-gray-800 hover:bg-yellow-500 shadow-lg"
                      >
                        {isLoadingAdvice ? '分析中...' : advice ? '查看建议' : '简历建议'}
                      </Button>
                      <Button 
                        theme="primary" 
                        icon={<CheckCircleIcon />}
                        onClick={handleSaveToAccount}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
                      >
                        {currentUser ? '保存到账户' : '登录保存'}
                      </Button>
                    </Space>
                  </div>
                </div>

                {/* 简历建议 Dialog 弹窗 */}
                {showAdviceDialog && advice && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  >
                    {/* 遮罩层 */}
                    <div 
                      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                      onClick={() => setShowAdviceDialog(false)}
                    />
                    {/* 弹窗内容 */}
                    <div 
                      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl"
                      style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                      {/* 关闭按钮 */}
                      <button
                        onClick={() => setShowAdviceDialog(false)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors z-10"
                      >
                        ✕
                      </button>
                      
                      <div className="p-6 overflow-y-auto">
                        {/* 建议头部 */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-yellow-200">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                              <LightbulbIcon size="24px" className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-800">简历优化建议</h3>
                              <span className="text-sm text-gray-500">AI 智能分析</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 bg-yellow-50 px-4 py-2 rounded-full">
                            <span className="text-sm text-gray-600">综合评分</span>
                            <div className={`text-3xl font-bold ${advice.score >= 80 ? 'text-green-600' : advice.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {advice.score}
                            </div>
                            <span className="text-gray-400">/100</span>
                          </div>
                        </div>

                        {/* AI 免责声明 */}
                        <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-lg px-4 py-3">
                          <p className="text-sm text-blue-600/80 text-center">
                            <InfoCircleIcon size="14px" className="inline mr-1" />
                            AI 生成的内容仅供参考，请结合实际情况进行判断和调整
                          </p>
                        </div>

                        {/* 总体评价 */}
                        <div className="mb-6">
                          <p className="text-gray-700 leading-relaxed bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 border border-yellow-100">
                            {advice.summary}
                          </p>
                        </div>

                        {/* 优点 */}
                        {advice.strengths && advice.strengths.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                              <ThumbUpIcon size="16px" className="mr-2 text-green-500" />
                              简历亮点
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {advice.strengths.map((strength, idx) => (
                                <Tag key={idx} theme="success" variant="light" size="large">
                                  {strength}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 改进建议 */}
                        {advice.improvements && advice.improvements.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                              <ErrorCircleIcon size="16px" className="mr-2 text-orange-500" />
                              改进建议
                            </h4>
                            <div className="space-y-3">
                              {advice.improvements.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl p-4 border-l-4 border-orange-400">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className="font-semibold text-gray-700">{item.section}</span>
                                  </div>
                                  <p className="text-sm text-red-600 mb-2">
                                    <span className="font-medium">问题：</span>{item.issue}
                                  </p>
                                  <p className="text-sm text-green-700">
                                    <span className="font-medium">建议：</span>{item.suggestion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 行动计划 */}
                        {advice.action_items && advice.action_items.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                              优化行动清单
                            </h4>
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                              <ul className="space-y-3">
                                {advice.action_items.map((item, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                                      {idx + 1}
                                    </span>
                                    <span className="text-gray-700">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* 关闭按钮 */}
                        <div className="mt-8 flex justify-center">
                          <Button
                            theme="primary"
                            size="large"
                            onClick={() => setShowAdviceDialog(false)}
                            className="px-8"
                          >
                            关闭
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 md:p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* 简历信息卡片 */}
                    <Card bordered={false} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
                      {/* 头部 */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <FileIcon size="20px" className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">简历信息</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isEditing ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {isEditing ? '编辑模式' : 'AI 提取'}
                            </span>
                          </div>
                        </div>
                        {!isEditing ? (
                          <Button 
                            theme="primary"
                            icon={<EditIcon />}
                            onClick={() => setIsEditing(true)}
                          >
                            编辑
                          </Button>
                        ) : (
                          <Space>
                            <Button 
                              theme="default"
                              onClick={() => {
                                setEditInfo(extractedInfo);
                                setIsEditing(false);
                              }}
                            >
                              取消
                            </Button>
                            <Button 
                              theme="primary"
                              onClick={() => {
                                handleSave();
                                setIsEditing(false);
                              }}
                            >
                              保存
                            </Button>
                          </Space>
                        )}
                      </div>

                      {/* 内容区域 */}
                      {isEditing ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block font-semibold text-gray-700 mb-2">{labels.name}</label>
                              <Input
                                value={editInfo.name}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, name: value as string })}
                                placeholder="请输入姓名"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-gray-700 mb-2">{labels.email}</label>
                              <Input
                                value={editInfo.email}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, email: value as string })}
                                placeholder="请输入邮箱"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block font-semibold text-gray-700 mb-2">{labels.phone}</label>
                              <Input
                                value={editInfo.phone}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, phone: value as string })}
                                placeholder="请输入电话"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">{labels.education}</label>
                            <Textarea
                              value={editInfo.education}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, education: value as string })}
                              placeholder="请输入教育背景"
                              autosize={{ minRows: 2, maxRows: 6 }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">{labels.experience}</label>
                            <Textarea
                              value={editInfo.experience}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, experience: value as string })}
                              placeholder="请输入工作/项目经历"
                              autosize={{ minRows: 4, maxRows: 10 }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">{labels.campusExperience}</label>
                            <Textarea
                              value={editInfo.campusExperience}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, campusExperience: value as string })}
                              placeholder="请输入校园经历（学生会、社团、志愿者等）"
                              autosize={{ minRows: 3, maxRows: 8 }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">{labels.skills}</label>
                            <Textarea
                              value={editInfo.skills}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, skills: value as string })}
                              placeholder="请输入技能"
                              autosize={{ minRows: 2, maxRows: 6 }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <InfoField label={labels.name} value={extractedInfo.name} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label={labels.email} value={extractedInfo.email} />
                            <InfoField label={labels.phone} value={extractedInfo.phone} />
                          </div>
                          <InfoField label={labels.education} value={extractedInfo.education} multiline />
                          <InfoField label={labels.experience} value={extractedInfo.experience} multiline />
                          {extractedInfo.campusExperience && (
                            <InfoField label={labels.campusExperience} value={extractedInfo.campusExperience} multiline />
                          )}
                          <InfoField label={labels.skills} value={extractedInfo.skills} multiline />
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Content>

        <Footer className="text-center py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6 text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
                <span className="text-sm">CVFiller 智能简历助手</span>
              </div>
              <span className="text-gray-400 hidden md:block">•</span>
              <span className="text-sm">专为校招网申设计</span>
            </div>
          </div>
        </Footer>
      </Layout>

      {/* 登录弹窗 */}
      <Dialog
        header="用户登录"
        visible={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        footer={
          <div className="flex justify-end space-x-3">
            <Button theme="default" onClick={() => setShowLoginDialog(false)}>取消</Button>
            <Button theme="primary" loading={isLoggingIn} onClick={handleLogin}>登录</Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <Input
              type="text"
              placeholder="请输入邮箱"
              value={loginForm.email}
              onChange={(val) => setLoginForm({ ...loginForm, email: val as string })}
              prefixIcon={<UserIcon />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={loginForm.password}
              onChange={(val) => setLoginForm({ ...loginForm, password: val as string })}
              prefixIcon={<LockOnIcon />}
            />
          </div>
          <div className="text-center text-sm text-gray-500">
            还没有账号？
            <Button
              theme="primary"
              variant="text"
              size="small"
              onClick={() => {
                setShowLoginDialog(false);
                setShowRegisterDialog(true);
              }}
            >
              立即注册
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 注册弹窗 */}
      <Dialog
        header="注册账号"
        visible={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
        footer={
          <div className="flex justify-end space-x-3">
            <Button theme="default" onClick={() => setShowRegisterDialog(false)}>取消</Button>
            <Button theme="primary" loading={isRegistering} onClick={handleRegister}>注册</Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <Input
              placeholder="请输入用户名"
              value={registerForm.username}
              onChange={(val) => setRegisterForm({ ...registerForm, username: val as string })}
              prefixIcon={<UserIcon />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <Input
              type="text"
              placeholder="请输入邮箱"
              value={registerForm.email}
              onChange={(val) => setRegisterForm({ ...registerForm, email: val as string })}
              prefixIcon={<UserIcon />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={registerForm.password}
              onChange={(val) => setRegisterForm({ ...registerForm, password: val as string })}
              prefixIcon={<LockOnIcon />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
            <Input
              type="password"
              placeholder="请再次输入密码"
              value={registerForm.confirmPassword}
              onChange={(val) => setRegisterForm({ ...registerForm, confirmPassword: val as string })}
              prefixIcon={<LockOnIcon />}
            />
          </div>
          <div className="text-center text-sm text-gray-500">
            已有账号？
            <Button
              theme="primary"
              variant="text"
              size="small"
              onClick={() => {
                setShowRegisterDialog(false);
                setShowLoginDialog(true);
              }}
            >
              立即登录
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function InfoField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const handleCopy = async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      console.log(`已复制: ${label}`);
    } catch (err) {
      console.error('复制失败:', err);
      // 回退方案
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        console.log(`已复制: ${label}`);
      } catch (e) {
        console.error('复制失败:', e);
      }
      document.body.removeChild(textarea);
    }
  };

  if (!value) return null;

  return (
    <div className="group bg-gray-50 hover:bg-blue-50 rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
          <div className={`text-gray-800 leading-relaxed ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
            {value}
          </div>
        </div>
        <Button
          theme="default"
          variant="text"
          size="small"
          icon={<CopyIcon />}
          onClick={handleCopy}
          className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          复制
        </Button>
      </div>
    </div>
  );
}

export default App;

import { useState, useRef } from 'react';
import { Layout, Button, Card, Input, Textarea, Space, NotificationPlugin } from 'tdesign-react';
import { UploadIcon, FileIcon, EditIcon, CopyIcon, DownloadIcon, CheckCircleIcon, InfoCircleIcon } from 'tdesign-icons-react';
import 'tdesign-react/esm/style/index.js';
import './App.css';

const { Header, Content, Footer } = Layout;

// API 配置
const API_BASE_URL = 'http://localhost:8000';

interface ResumeInfo {
  name: string;
  email: string;
  phone: string;
  education: string;
  experience: string;
  skills: string;
}

const emptyResumeInfo: ResumeInfo = {
  name: '',
  email: '',
  phone: '',
  education: '',
  experience: '',
  skills: '',
};

const labels: Record<keyof ResumeInfo, string> = {
  name: '姓名',
  email: '邮箱',
  phone: '电话',
  education: '教育背景',
  experience: '工作经历',
  skills: '技能',
};

function App() {
  const [extractedInfo, setExtractedInfo] = useState<ResumeInfo>(emptyResumeInfo);
  const [editInfo, setEditInfo] = useState<ResumeInfo>(emptyResumeInfo);
  const [hasFile, setHasFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (title: string, content: string, theme: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    NotificationPlugin[theme]({
      title,
      content,
      placement: 'top-right',
      duration: 3000,
    });
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

    setIsUploading(true);
    showNotification('提示', '正在上传并解析简历，请稍候...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/parse-resume`, {
        method: 'POST',
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
              const desc = work.description || work.details || work.content || '';
              return `${company} | ${position} | ${start} - ${end}\n${desc}`.trim();
            }),
            ...(data.projects || []).map((proj: any) => {
              const name = proj.name || proj.project_name || proj.title || '';
              const role = proj.role || proj.position || '项目成员';
              const start = proj.start_date || proj.start || proj.from || '';
              const end = proj.end_date || proj.end || proj.to || '';
              const desc = proj.description || proj.details || proj.content || '';
              return `项目：${name} | ${role} | ${start} - ${end}\n${desc}`.trim();
            })
          ].filter(Boolean).join('\n\n\n') || data.experience_text || '',
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

  const handleCopyToClipboard = () => {
    const text = Object.entries(editInfo)
      .map(([key, value]) => `${labels[key as keyof ResumeInfo]}: ${value}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showNotification('成功', '已复制到剪贴板！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
      
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
        </Header>

        <Content className="p-4 md:p-8">
          {!hasFile ? (
            <div className="max-w-5xl mx-auto">
              <Card className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-2xl rounded-3xl overflow-hidden">
                <div className="relative bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-8 md:p-16 text-center text-white">
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative">
                    <UploadIcon size="64px" className="mb-4 md:mb-6 text-white/90" />
                    <h2 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 tracking-tight">智能简历处理</h2>
                    <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
                      AI 自动提取信息，一键填写网申表格
                    </p>
                  </div>
                </div>
                
                <div className="p-8 md:p-12">
                  <div className="mb-8 md:mb-12 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                    />
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
                    </Space>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="max-w-4xl mx-auto">
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
                              <label className="block font-semibold text-gray-700 mb-2">姓名</label>
                              <Input
                                value={editInfo.name}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, name: value as string })}
                                placeholder="请输入姓名"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-gray-700 mb-2">邮箱</label>
                              <Input
                                value={editInfo.email}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, email: value as string })}
                                placeholder="请输入邮箱"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block font-semibold text-gray-700 mb-2">电话</label>
                              <Input
                                value={editInfo.phone}
                                onChange={(value: string | number) => setEditInfo({ ...editInfo, phone: value as string })}
                                placeholder="请输入电话"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">教育背景</label>
                            <Textarea
                              value={editInfo.education}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, education: value as string })}
                              placeholder="请输入教育背景"
                              autosize={{ minRows: 2, maxRows: 6 }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">工作经历</label>
                            <Textarea
                              value={editInfo.experience}
                              onChange={(value: string | number) => setEditInfo({ ...editInfo, experience: value as string })}
                              placeholder="请输入工作经历"
                              autosize={{ minRows: 4, maxRows: 10 }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-gray-700 mb-2">技能</label>
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
                          <InfoField label="姓名" value={extractedInfo.name} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="邮箱" value={extractedInfo.email} />
                            <InfoField label="电话" value={extractedInfo.phone} />
                          </div>
                          <InfoField label="教育背景" value={extractedInfo.education} multiline />
                          <InfoField label="工作经历" value={extractedInfo.experience} multiline />
                          <InfoField label="技能" value={extractedInfo.skills} multiline />
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
    </div>
  );
}

function InfoField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      NotificationPlugin.success({
        title: '已复制',
        content: `${label}已复制到剪贴板`,
        placement: 'top-right',
        duration: 2000,
      });
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

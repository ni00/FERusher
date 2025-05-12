"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Filter,
  Star,
  Download,
  Shuffle,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Settings,
  Bot,
  Moon,
  Sun,
  Copy,
  Github,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMobile } from "@/hooks/use-mobile"
import { Question, Questions, categories, companies, levels } from "@/lib/interview-data"
import { getAiAnalysis as fetchAiAnalysis, AiSettings } from "@/lib/openai"
import { defaultAiSettings } from "@/lib/ai-defaults"
import { useTheme } from "next-themes"
import Markdown from "@/app/components/markdown"

export default function InterviewQuestionsPage() {
  const isMobile = useMobile()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showGithubBanner, setShowGithubBanner] = useState(true)

  useEffect(() => {
    setMounted(true)
    // 从localStorage中读取横幅显示状态
    const bannerState = localStorage.getItem("githubBannerClosed")
    if (bannerState === "true") {
      setShowGithubBanner(false)
    }
  }, [])

  // 关闭横幅并保存状态到localStorage
  const closeGithubBanner = () => {
    setShowGithubBanner(false)
    localStorage.setItem("githubBannerClosed", "true")
  }

  // 添加换一道题的函数
  const getNextRandomQuestion = () => {
    const visibleQuestions = questions.filter((q) => !q.isHidden && q.id !== currentRandomQuestion?.id)
    if (visibleQuestions.length === 0) {
      toast({
        title: "没有更多可用的问题",
        description: "请尝试重置筛选条件或显示更多问题。",
        variant: "destructive",
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * visibleQuestions.length)
    const randomQuestion = visibleQuestions[randomIndex]

    // 设置新的随机题目
    setCurrentRandomQuestion(randomQuestion)
  }

  // 在 InterviewQuestionsPage 函数顶部添加这些状态
  const [randomQuestionDialogOpen, setRandomQuestionDialogOpen] = useState(false)
  const [currentRandomQuestion, setCurrentRandomQuestion] = useState<Question | null>(null)

  // State
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [showHidden, setShowHidden] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("全部")
  const [selectedCategory, setSelectedCategory] = useState("全部")
  const [selectedLevel, setSelectedLevel] = useState("全部")
  const [selectedRating, setSelectedRating] = useState(0)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [showScrollTop, setShowScrollTop] = useState(false)

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{ [key: number]: string }>({})
  const [isAnalyzing, setIsAnalyzing] = useState<{ [key: number]: boolean }>({})

  // AI Model settings state
  const [aiModelSettings, setAiModelSettings] = useState<AiSettings>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("aiModelSettings")
      if (savedSettings) {
        return JSON.parse(savedSettings)
      }
    }
    return defaultAiSettings
  })

  // 添加设置对话框的开关状态
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)

  // 从 localStorage 中加载筛选状态的函数
  const loadFilterState = () => {
    const savedState = localStorage.getItem("interviewFilterState")
    if (savedState) {
      const state = JSON.parse(savedState)
      setSearchTerm(state.searchTerm || "")
      setSelectedCompany(state.selectedCompany || "全部")
      setSelectedCategory(state.selectedCategory || "全部")
      setSelectedLevel(state.selectedLevel || "全部")
      setSelectedRating(state.selectedRating || 0)
      setShowOnlyFavorites(state.showOnlyFavorites || false)
      setShowHidden(state.showHidden || false)
      setActiveTab(state.activeTab || "all")
      setCurrentPage(state.currentPage || 1)
      setItemsPerPage(state.itemsPerPage || 10)
    }
  }

  // 修改 useEffect 钩子，加载用户的筛选状态
  useEffect(() => {
    // In a real app, this would be an API call
    const savedQuestions = localStorage.getItem("interviewQuestions")
    if (savedQuestions) {
      setQuestions(JSON.parse(savedQuestions))
    } else {
      setQuestions(Questions)
      localStorage.setItem("interviewQuestions", JSON.stringify(Questions))
    }
    
    // 加载保存的筛选状态
    loadFilterState()
  }, [])
  
  // Apply filters and pagination
  useEffect(() => {
    let result = [...questions]

    // Apply tab filter
    if (activeTab === "favorites") {
      result = result.filter((q) => q.isFavorite)
    }

    // Apply search
    if (searchTerm) {
      result = result.filter(
        (q) =>
          q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.company.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Apply company filter
    if (selectedCompany !== "全部") {
      result = result.filter((q) => q.company === selectedCompany)
    }

    // Apply category filter
    if (selectedCategory !== "全部") {
      result = result.filter((q) => q.category === selectedCategory)
    }

    // Apply level filter
    if (selectedLevel !== "全部") {
      result = result.filter((q) => q.level === selectedLevel)
    }

    // Apply rating filter
    if (selectedRating > 0) {
      result = result.filter((q) => q.rating >= selectedRating)
    }

    // Apply favorites filter
    if (showOnlyFavorites) {
      result = result.filter((q) => q.isFavorite)
    }

    // Apply hidden filter
    if (!showHidden) {
      result = result.filter((q) => !q.isHidden)
    }

    // Calculate total pages
    setTotalPages(Math.ceil(result.length / itemsPerPage))

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedResult = result.slice(startIndex, startIndex + itemsPerPage)

    setFilteredQuestions(paginatedResult)
  }, [
    questions,
    searchTerm,
    selectedCompany,
    selectedCategory,
    selectedLevel,
    selectedRating,
    showOnlyFavorites,
    showHidden,
    currentPage,
    itemsPerPage,
    activeTab,
  ])
  
  // 修改筛选相关的 useState 钩子，使其在状态变化时保存状态
  const setSearchTermAndSave = (value: string) => {
    setSearchTerm(value)
    // 将页码重置为 1，避免筛选结果变化后出现空页面
    setCurrentPage(1)
    // 保存状态，但需要使用最新的页码值(1)
    const filterState = {
      searchTerm: value,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setSelectedCompanyAndSave = (value: string) => {
    setSelectedCompany(value)
    setCurrentPage(1)
    // 保存状态，使用最新的页码值(1)
    const filterState = {
      searchTerm,
      selectedCompany: value,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setSelectedCategoryAndSave = (value: string) => {
    setSelectedCategory(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory: value,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setSelectedLevelAndSave = (value: string) => {
    setSelectedLevel(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel: value,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setSelectedRatingAndSave = (value: number) => {
    setSelectedRating(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating: value,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setShowOnlyFavoritesAndSave = (value: boolean) => {
    setShowOnlyFavorites(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites: value,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setShowHiddenAndSave = (value: boolean) => {
    setShowHidden(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden: value,
      activeTab,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setActiveTabAndSave = (value: string) => {
    setActiveTab(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab: value,
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setCurrentPageAndSave = (value: number) => {
    // 使用函数式更新确保获取到最新的状态值
    setCurrentPage(value)
    // 直接将当前值保存到localStorage，不使用setTimeout延迟
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: value, // 使用传入的新值而不是依赖state
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  const setItemsPerPageAndSave = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
    // 直接保存最新状态
    const filterState = {
      searchTerm,
      selectedCompany,
      selectedCategory,
      selectedLevel,
      selectedRating,
      showOnlyFavorites,
      showHidden,
      activeTab,
      currentPage: 1,
      itemsPerPage: value
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  // 修改 resetFilters 函数，使其重置后保存状态
  const resetFilters = () => {
    // 设置重置值
    setSearchTerm("")
    setSelectedCompany("全部")
    setSelectedCategory("全部")
    setSelectedLevel("全部")
    setSelectedRating(0)
    setShowOnlyFavorites(false)
    setCurrentPage(1)
    setActiveTab("all")
    
    // 直接保存重置后的状态
    const filterState = {
      searchTerm: "",
      selectedCompany: "全部",
      selectedCategory: "全部",
      selectedLevel: "全部",
      selectedRating: 0,
      showOnlyFavorites: false,
      showHidden,
      activeTab: "all",
      currentPage: 1,
      itemsPerPage
    }
    localStorage.setItem("interviewFilterState", JSON.stringify(filterState))
  }
  
  // 修改 handlePageChange 函数，使其在页码变化时保存状态
  const handlePageChange = (page: number) => {
    setCurrentPageAndSave(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Scroll to top 函数
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Toggle favorite
  const toggleFavorite = (id: number) => {
    const updatedQuestions = questions.map((q) => (q.id === id ? { ...q, isFavorite: !q.isFavorite } : q))
    setQuestions(updatedQuestions)
    localStorage.setItem("interviewQuestions", JSON.stringify(updatedQuestions))

    const question = updatedQuestions.find((q) => q.id === id)
    if (question) {
      toast({
        title: question.isFavorite ? "已添加到收藏" : "已从收藏中移除",
        description: question.content.substring(0, 30) + (question.content.length > 30 ? "..." : ""),
      })
    }
  }

  // Toggle hidden
  const toggleHidden = (id: number) => {
    const updatedQuestions = questions.map((q) => (q.id === id ? { ...q, isHidden: !q.isHidden } : q))
    setQuestions(updatedQuestions)
    localStorage.setItem("interviewQuestions", JSON.stringify(updatedQuestions))

    const question = updatedQuestions.find((q) => q.id === id)
    if (question) {
      toast({
        title: question.isHidden ? "问题已隐藏" : "问题已显示",
        description: question.content.substring(0, 30) + (question.content.length > 30 ? "..." : ""),
      })
    }
  }

  // 修改 getRandomQuestion 函数
  const getRandomQuestion = () => {
    const visibleQuestions = questions.filter((q) => !q.isHidden)
    if (visibleQuestions.length === 0) {
      toast({
        title: "没有可用的问题",
        description: "所有问题都被隐藏了，请先显示一些问题。",
        variant: "destructive",
      })
      return
    }

    const randomIndex = Math.floor(Math.random() * visibleQuestions.length)
    const randomQuestion = visibleQuestions[randomIndex]

    // 设置当前随机题目并打开对话框
    setCurrentRandomQuestion(randomQuestion)
    setRandomQuestionDialogOpen(true)
  }

  // Export favorites
  const exportFavorites = () => {
    const favorites = questions.filter((q) => q.isFavorite)
    if (favorites.length === 0) {
      toast({
        title: "没有收藏的问题",
        description: "请先收藏一些问题再导出。",
        variant: "destructive",
      })
      return
    }

    const exportData = JSON.stringify(favorites, null, 2)
    const blob = new Blob([exportData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `前端面试题收藏-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "导出成功",
      description: `已导出 ${favorites.length} 个收藏的问题。`,
    })
  }

  // Save AI model settings
  const saveAiModelSettings = (settings: AiSettings) => {
    setAiModelSettings(settings)
    localStorage.setItem("aiModelSettings", JSON.stringify(settings))
    // 保存后关闭对话框
    setAiSettingsOpen(false)
    toast({
      title: "设置已保存",
      description: "AI模型设置已更新",
    })
  }

  // Get AI analysis
  const getAiAnalysis = async (id: number) => {
    // If analysis already exists, don't fetch again
    if (aiAnalysis[id] || isAnalyzing[id]) {
      return
    }

    const question = questions.find((q) => q.id === id)
    if (!question) return

    setIsAnalyzing((prev) => ({
      ...prev,
      [id]: true,
    }))

    // 如果开启了流式传输
    if (aiModelSettings.streaming) {
      // 初始化空内容
      setAiAnalysis((prev) => ({
        ...prev,
        [id]: "",
      }))
      
      // 流式处理函数
      const handleStreamingChunk = (chunk: string) => {
        setAiAnalysis((prev) => ({
          ...prev,
          [id]: chunk,
        }))
      }
      
      try {
        // 使用流式API
        await fetchAiAnalysis(question.content, aiModelSettings, handleStreamingChunk)
        
      } catch (error) {
        console.error("AI分析失败:", error)
        setAiAnalysis((prev) => ({
          ...prev,
          [id]: `分析生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }))
      } finally {
        setIsAnalyzing((prev) => ({
          ...prev,
          [id]: false,
        }))
      }
    } else {
      // 非流式传输方式
      setAiAnalysis((prev) => ({
        ...prev,
        [id]: "正在分析中...",
      }))
      
      try {
        // 使用新的OpenAI工具类
        const analysis = await fetchAiAnalysis(question.content, aiModelSettings)
        
        setAiAnalysis((prev) => ({
          ...prev,
          [id]: analysis,
        }))
      } catch (error) {
        console.error("AI分析失败:", error)
        setAiAnalysis((prev) => ({
          ...prev,
          [id]: `分析生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        }))
      } finally {
        setIsAnalyzing((prev) => ({
          ...prev,
          [id]: false,
        }))
      }
    }
  }

  // Scroll event listener for "back to top" button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Render star rating
  const renderStarRating = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  // Render pagination
  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = isMobile ? 3 : 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className="w-9 h-9 p-0"
        >
          {i}
        </Button>,
      )
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-9 h-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {startPage > 1 && (
          <>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} className="w-9 h-9 p-0">
              1
            </Button>
            {startPage > 2 && <span className="mx-1">...</span>}
          </>
        )}

        {pages}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="mx-1">...</span>}
            <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} className="w-9 h-9 p-0">
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-9 h-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // 在顶部导航栏添加主题切换按钮
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // 修改主题切换按钮渲染逻辑
  const renderThemeToggle = () => {
    // 如果未挂载，返回一个占位按钮，避免水合错误
    if (!mounted) {
      return (
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <span className="h-4 w-4" />
          <span className="hidden sm:inline">主题</span>
        </Button>
      )
    }

    // 挂载后根据当前主题渲染正确的图标和文本
    return (
      <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center gap-1">
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span className="hidden sm:inline">{theme === "light" ? "暗黑模式" : "明亮模式"}</span>
      </Button>
    )
  }

  // 添加复制AI分析的函数
  const copyAiAnalysis = (questionContent: string, analysisContent: string) => {
    const textToCopy = `问题：${questionContent}\n\n分析：\n${analysisContent}`;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({
          title: "复制成功",
          description: "问题和AI分析已复制到剪贴板",
        });
      })
      .catch((error) => {
        console.error("复制失败:", error);
        toast({
          title: "复制失败",
          description: "无法复制到剪贴板",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:px-6">
      <div className="flex flex-col space-y-4">
        {showGithubBanner && (
          <div className="relative bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-primary" />
              <p>
                本项目已开源！访问 <a 
                  href="https://github.com/ni00/FERusher" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  Github 仓库
                </a> 查看源码，如果觉得有用请给个 Star ⭐
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeGithubBanner} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">FERusher | 切图仔，冲冲冲！</h1>

          <div className="flex flex-wrap gap-2">
            {renderThemeToggle()}
            
            <Button variant="outline" size="sm" onClick={getRandomQuestion} className="flex items-center gap-1">
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">随机题目</span>
            </Button>

            <Button variant="outline" size="sm" onClick={exportFavorites} className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">导出收藏</span>
            </Button>

            <Dialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => setAiSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">AI设置</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader className="px-1">
                  <DialogTitle>AI模型设置</DialogTitle>
                  <DialogDescription>配置用于AI解析的大语言模型API设置</DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(80vh-120px)] overflow-y-auto px-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const settings: AiSettings = {
                      apiKey: formData.get("apiKey") as string,
                      model: formData.get("model") as string,
                      baseUrl: formData.get("baseUrl") as string,
                      prompt: formData.get("prompt") as string,
                      streaming: formData.get("streaming") === "on",
                    }
                    saveAiModelSettings(settings)
                  }}
                  className="space-y-4 mt-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API密钥</Label>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      type="password"
                      placeholder="输入你的API密钥"
                      defaultValue={aiModelSettings.apiKey}
                    />
                    <p className="text-xs text-muted-foreground">你的API密钥将只存储在本地浏览器中，不会发送到服务器</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">模型</Label>
                    <Input
                      id="model"
                      name="model"
                      placeholder="输入模型名称，如 gpt-4、glm-4 等"
                      defaultValue={aiModelSettings.model}
                    />
                    <p className="text-xs text-muted-foreground">
                      输入你想使用的模型名称，例如：gpt-4、glm-4、claude-3-opus 等
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">API基础URL</Label>
                    <Input
                      id="baseUrl"
                      name="baseUrl"
                      placeholder="API基础URL"
                      defaultValue={aiModelSettings.baseUrl}
                    />
                    <p className="text-xs text-muted-foreground">
                      如果使用代理或其他API提供商，可以修改基础URL
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="prompt">分析提示词</Label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      placeholder="自定义提示词模板"
                      defaultValue={aiModelSettings.prompt}
                      className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      使用 {'{question}'} 作为问题内容的占位符
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="streaming"
                      name="streaming"
                      checked={aiModelSettings.streaming}
                      onCheckedChange={(checked) => {
                        setAiModelSettings({
                          ...aiModelSettings,
                          streaming: checked as boolean
                        })
                      }}
                    />
                    <label
                      htmlFor="streaming"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      启用流式传输（打字机效果）
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    启用后，AI分析结果将实时逐字显示，提供更好的交互体验
                  </p>

                  <div className="flex justify-end gap-2">
                    <Button type="submit">保存设置</Button>
                  </div>
                </form>
                </div>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">筛选</span>
                </Button>
              </SheetTrigger>
              <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[80vh]" : ""}>
                <SheetHeader>
                  <SheetTitle>筛选条件</SheetTitle>
                  <SheetDescription>设置筛选条件以找到你需要的面试题</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">搜索</Label>
                    <Input
                      id="search"
                      placeholder="搜索问题或公司..."
                      value={searchTerm}
                      onChange={(e) => setSearchTermAndSave(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">公司</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompanyAndSave}>
                      <SelectTrigger id="company">
                        <SelectValue placeholder="选择公司" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company} value={company}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">分类</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategoryAndSave}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">面试轮次</Label>
                    <Select value={selectedLevel} onValueChange={setSelectedLevelAndSave}>
                      <SelectTrigger id="level">
                        <SelectValue placeholder="选择轮次" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rating">最低难度星级</Label>
                    <Select
                      value={selectedRating.toString()}
                      onValueChange={(value) => setSelectedRatingAndSave(Number.parseInt(value))}
                    >
                      <SelectTrigger id="rating">
                        <SelectValue placeholder="选择最低星级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">全部</SelectItem>
                        <SelectItem value="1">⭐ 及以上</SelectItem>
                        <SelectItem value="2">⭐⭐ 及以上</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ 及以上</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ 及以上</SelectItem>
                        <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="favorites"
                      checked={showOnlyFavorites}
                      onCheckedChange={(checked) => setShowOnlyFavoritesAndSave(checked as boolean)}
                    />
                    <label
                      htmlFor="favorites"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      只显示收藏
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hidden"
                      checked={showHidden}
                      onCheckedChange={(checked) => setShowHiddenAndSave(checked as boolean)}
                    />
                    <label
                      htmlFor="hidden"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      显示隐藏的问题
                    </label>
                  </div>

                  <Button onClick={resetFilters}>重置筛选条件</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="w-full">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="搜索问题或公司..."
              value={searchTerm}
              onChange={(e) => setSearchTermAndSave(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTabAndSave}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">全部问题</TabsTrigger>
              <TabsTrigger value="favorites">我的收藏</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((question) => (
                    <Card
                      key={question.id}
                      id={`question-${question.id}`}
                      className={`transition-all duration-300 ${question.isHidden ? "opacity-60" : ""}`}
                    >
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">{question.company}</span>
                            <Badge variant="outline">{question.level}</Badge>
                            <Badge variant="secondary">{question.category}</Badge>
                            <span className="text-xs text-muted-foreground">{question.date}</span>
                          </div>
                          {renderStarRating(question.rating)}
                        </div>

                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                                onClick={() => getAiAnalysis(question.id)}
                                title="AI分析"
                              >
                                <Bot className="h-4 w-4" />
                                <span className="hidden sm:inline">AI分析</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <DialogTitle>AI 解析</DialogTitle>
                                    <DialogDescription>针对"{question.content}"</DialogDescription>
                                  </div>
                                  {aiAnalysis[question.id] && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => copyAiAnalysis(question.content, aiAnalysis[question.id])}
                                      title="复制内容"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </DialogHeader>
                              <div className="max-h-[calc(80vh-120px)] overflow-y-auto pr-1 mt-4">
                                {aiAnalysis[question.id] ? (
                                  <Markdown 
                                    content={aiAnalysis[question.id]} 
                                    className={aiModelSettings.streaming && isAnalyzing[question.id] ? "animate-pulse-caret" : ""}
                                  />
                                ) : isAnalyzing[question.id] ? (
                                  <div className="flex items-center justify-center p-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-2">正在生成AI解析...</span>
                                  </div>
                                ) : (
                                  <div className="text-center p-4">
                                    <p>点击"分析"按钮开始生成AI解析</p>
                                    <Button 
                                      onClick={() => getAiAnalysis(question.id)} 
                                      className="mt-2"
                                    >
                                      <Bot className="h-4 w-4 mr-2" />
                                      分析
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            onClick={() => toggleFavorite(question.id)}
                            className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                            title="收藏"
                          >
                            {question.isFavorite ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{question.isFavorite ? "已收藏" : "收藏"}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => toggleHidden(question.id)}
                            className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                            title={question.isHidden ? "显示" : "隐藏"}
                          >
                            {question.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            <span className="hidden sm:inline">{question.isHidden ? "显示" : "隐藏"}</span>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-2">
                        <p className="text-base">{question.content}</p>
                      </CardContent>
                    </Card>
                  ))}

                  {renderPagination()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">没有找到符合条件的问题</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    重置筛选条件
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-0">
              {filteredQuestions.length > 0 ? (
                <div className="space-y-4">
                  {filteredQuestions.map((question) => (
                    <Card
                      key={question.id}
                      id={`question-${question.id}`}
                      className={`transition-all duration-300 ${question.isHidden ? "opacity-60" : ""}`}
                    >
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">{question.company}</span>
                            <Badge variant="outline">{question.level}</Badge>
                            <Badge variant="secondary">{question.category}</Badge>
                            <span className="text-xs text-muted-foreground">{question.date}</span>
                          </div>
                          {renderStarRating(question.rating)}
                        </div>

                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                                onClick={() => getAiAnalysis(question.id)}
                                title="AI分析"
                              >
                                <Bot className="h-4 w-4" />
                                <span className="hidden sm:inline">AI分析</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <DialogTitle>AI 解析</DialogTitle>
                                    <DialogDescription>针对"{question.content}"</DialogDescription>
                                  </div>
                                  {aiAnalysis[question.id] && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => copyAiAnalysis(question.content, aiAnalysis[question.id])}
                                      title="复制内容"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </DialogHeader>
                              <div className="max-h-[calc(80vh-120px)] overflow-y-auto pr-1 mt-4">
                                {aiAnalysis[question.id] ? (
                                  <Markdown 
                                    content={aiAnalysis[question.id]} 
                                    className={aiModelSettings.streaming && isAnalyzing[question.id] ? "animate-pulse-caret" : ""}
                                  />
                                ) : isAnalyzing[question.id] ? (
                                  <div className="flex items-center justify-center p-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-2">正在生成AI解析...</span>
                                  </div>
                                ) : (
                                  <div className="text-center p-4">
                                    <p>点击"分析"按钮开始生成AI解析</p>
                                    <Button 
                                      onClick={() => getAiAnalysis(question.id)} 
                                      className="mt-2"
                                    >
                                      <Bot className="h-4 w-4 mr-2" />
                                      分析
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            onClick={() => toggleFavorite(question.id)}
                            className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                            title="收藏"
                          >
                            {question.isFavorite ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{question.isFavorite ? "已收藏" : "收藏"}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => toggleHidden(question.id)}
                            className="h-8 px-2 text-xs sm:text-sm flex items-center gap-1"
                            title={question.isHidden ? "显示" : "隐藏"}
                          >
                            {question.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            <span className="hidden sm:inline">{question.isHidden ? "显示" : "隐藏"}</span>
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-2">
                        <p className="text-base">{question.content}</p>
                      </CardContent>
                    </Card>
                  ))}

                  {renderPagination()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">没有收藏的问题</p>
                  <Button variant="outline" onClick={() => setActiveTab("all")} className="mt-4">
                    浏览所有问题
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showScrollTop && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-10 w-10 rounded-full shadow-md"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* 随机题目对话框 */}
      <Dialog open={randomQuestionDialogOpen} onOpenChange={setRandomQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>随机面试题</DialogTitle>
            <DialogDescription>随机抽取的前端面试题，点击"换一道"可以切换到其他题目</DialogDescription>
          </DialogHeader>

          {currentRandomQuestion && (
            <div className="mt-4 space-y-4 max-h-[calc(80vh-150px)] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{currentRandomQuestion.company}</span>
                <Badge variant="outline">{currentRandomQuestion.level}</Badge>
                <Badge variant="secondary">{currentRandomQuestion.category}</Badge>
                <span className="text-xs text-muted-foreground">{currentRandomQuestion.date}</span>
              </div>

              <div className="flex">{renderStarRating(currentRandomQuestion.rating)}</div>

              <div className="p-4 border rounded-md bg-muted/30">
                <p className="text-base">{currentRandomQuestion.content}</p>
              </div>

              <div className="flex flex-col space-y-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => getAiAnalysis(currentRandomQuestion.id)}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      查看AI解析
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <DialogTitle>AI 解析</DialogTitle>
                          <DialogDescription>针对"{currentRandomQuestion.content}"</DialogDescription>
                        </div>
                        {aiAnalysis[currentRandomQuestion.id] && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => copyAiAnalysis(currentRandomQuestion.content, aiAnalysis[currentRandomQuestion.id])}
                            title="复制内容"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </DialogHeader>
                    <div className="max-h-[calc(80vh-120px)] overflow-y-auto pr-1 mt-4">
                      {aiAnalysis[currentRandomQuestion.id] ? (
                        <Markdown 
                          content={aiAnalysis[currentRandomQuestion.id]} 
                          className={aiModelSettings.streaming && isAnalyzing[currentRandomQuestion.id] ? "animate-pulse-caret" : ""}
                        />
                      ) : isAnalyzing[currentRandomQuestion.id] ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          <span className="ml-2">正在生成AI解析...</span>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <p>点击"分析"按钮开始生成AI解析</p>
                          <Button 
                            onClick={() => getAiAnalysis(currentRandomQuestion.id)} 
                            className="mt-2"
                          >
                            <Bot className="h-4 w-4 mr-2" />
                            分析
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant={currentRandomQuestion.isFavorite ? "default" : "outline"}
                    onClick={() => toggleFavorite(currentRandomQuestion.id)}
                    className="flex items-center gap-1"
                  >
                    {currentRandomQuestion.isFavorite ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        已收藏
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        收藏
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => toggleHidden(currentRandomQuestion.id)}
                    className="flex items-center gap-1"
                  >
                    {currentRandomQuestion.isHidden ? (
                      <>
                        <Eye className="h-4 w-4" />
                        已隐藏
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        隐藏
                      </>
                    )}
                  </Button>
                </div>

                <Button onClick={getNextRandomQuestion} className="flex items-center gap-1">
                  <Shuffle className="h-4 w-4" />
                  换一道
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />

      <style jsx global>{`
        .highlight-question {
          animation: highlight 2s ease-in-out;
        }
        
        @keyframes highlight {
          0%, 100% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(var(--primary-rgb), 0.1);
          }
        }
        
        .animate-pulse-caret {
          position: relative;
        }
        
        .animate-pulse-caret::after {
          content: '';
          position: absolute;
          display: inline-block;
          width: 2px;
          height: 1.2em;
          background-color: currentColor;
          animation: blink 1s step-end infinite;
          margin-left: 1px;
          opacity: 0.7;
        }
        
        @keyframes blink {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        /* 自定义滚动条样式 */
        .max-h-\\[calc\\(80vh-120px\\)\\],
        .max-h-\\[calc\\(80vh-150px\\)\\] {
          /* 滚动条宽度和轨道样式 */
          &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          &::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
          }
          
          /* 滚动条滑块样式 */
          &::-webkit-scrollbar-thumb {
            background: rgba(var(--primary-rgb), 0.2);
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          
          &::-webkit-scrollbar-thumb:hover {
            background: rgba(var(--primary-rgb), 0.5);
          }
          
          /* Firefox滚动条样式 */
          scrollbar-width: thin;
          scrollbar-color: rgba(var(--primary-rgb), 0.2) rgba(0, 0, 0, 0.05);
        }
        
        /* Markdown样式 */
        .prose {
          @apply text-foreground max-w-none;
          line-height: 1.75;
        }
        
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          @apply font-bold text-foreground scroll-m-20;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          line-height: 1.3;
        }
        
        .prose h1 {
          @apply text-3xl;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        
        .prose h2 {
          @apply text-2xl border-b pb-1 border-border/40;
          font-weight: 700;
          letter-spacing: -0.015em;
        }
        
        .prose h3 {
          @apply text-xl font-semibold;
        }
        
        .prose h4 {
          @apply text-lg font-semibold;
        }
        
        .prose h5, .prose h6 {
          @apply font-semibold;
        }
        
        .prose p {
          @apply leading-7 my-6;
        }
        
        .prose ul, .prose ol {
          @apply pl-6 my-6 space-y-2;
        }
        
        .prose ul {
          @apply list-disc;
          position: relative;
          padding-left: 1.75rem;
        }
        
        .prose ol {
          @apply list-decimal;
          position: relative;
          padding-left: 1.75rem;
          counter-reset: item;
        }
        
        .prose ul li {
          position: relative;
          padding-left: 0.5rem;
        }
        
        .prose ul li::before {
          content: "";
          position: absolute;
          background-color: hsl(var(--muted-foreground));
          border-radius: 50%;
          width: 0.375rem;
          height: 0.375rem;
          top: 0.6875em;
          left: -1.25rem;
          opacity: 0.8;
        }
        
        .prose ol li {
          position: relative;
          padding-left: 0.5rem;
        }
        
        .prose ol li::before {
          position: absolute;
          left: -1.75rem;
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          opacity: 0.8;
        }
        
        .prose li {
          @apply mb-2;
          padding-left: 0.375rem;
        }
        
        .prose li p {
          @apply my-1;
        }
        
        .prose li > ul, .prose li > ol {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        
        .prose blockquote {
          @apply border-l-4 border-primary/30 pl-4 italic my-6 text-muted-foreground;
          padding: 0.6em 1.2em;
          background-color: hsl(var(--muted) / 0.3);
          border-radius: 0.25rem;
        }
        
        .prose blockquote p {
          @apply m-0;
        }
        
        .prose code {
          @apply bg-muted px-1.5 py-0.5 rounded text-sm font-mono border border-border/30;
          font-feature-settings: "calt" 1;
        }
        
        .prose pre {
          @apply bg-muted p-4 rounded-md overflow-x-auto my-6 border border-border/30;
          font-feature-settings: "calt" 1;
        }
        
        .prose pre code {
          @apply bg-transparent p-0 text-sm border-0;
          counter-reset: line;
          display: block;
        }
        
        .prose a {
          @apply text-primary underline underline-offset-4 font-medium hover:text-primary/80 transition-colors;
        }
        
        .prose table {
          @apply w-full my-6 overflow-hidden rounded-md;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid hsl(var(--border));
        }
        
        .prose table th {
          @apply bg-muted font-medium px-4 py-2 text-left;
          border-bottom: 1px solid hsl(var(--border));
        }
        
        .prose table tr:nth-child(even) {
          @apply bg-muted/50;
        }
        
        .prose table td {
          @apply p-3 border-t border-border/50;
        }
        
        .prose table tr:first-child td {
          @apply border-t-0;
        }
        
        .prose hr {
          @apply border-border my-8;
          margin: 2.5rem auto;
          width: 80%;
          border-width: 0;
          border-top-width: 1px;
          border-style: solid;
          border-color: hsl(var(--border) / 0.5);
        }
        
        .prose img {
          @apply rounded-md my-6 border border-border/30;
          max-width: 100%;
          height: auto;
        }
        
        .prose strong {
          @apply font-bold text-foreground;
        }
        
        .prose em {
          @apply italic;
        }
        
        .prose mark {
          @apply bg-primary/20 px-1 rounded;
        }
        
        .prose *:first-child {
          @apply mt-0;
        }
        
        .prose *:last-child {
          @apply mb-0;
        }
        
        .prose details {
          @apply my-4 border border-border rounded-md overflow-hidden;
        }
        
        .prose details summary {
          @apply bg-muted p-2 cursor-pointer font-medium;
        }
        
        .prose details[open] summary {
          @apply border-b border-border;
        }
        
        .prose details > *:not(summary) {
          @apply p-4;
        }
      `}</style>
    </div>
  )
}

/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'CodeSeed · 码芽',
  author: 'CodeSeed · 码芽',
  headerTitle: 'CodeSeed · 码芽',
  slogan: '从第一行代码，开始你的成长。',
  description: '面向编程初学者的技术学习与知识分享平台。',
  language: 'zh-CN',
  theme: 'light',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  // 保留上游仓库地址，用于遵守原模板的 MIT License 和来源说明。
  siteRepo: 'https://github.com/timlrx/tailwind-nextjs-starter-blog',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/twitter-card.png`,
  locale: 'zh-CN',
  stickyNav: false,
  analytics: {},
  newsletter: {
    provider: null,
  },
  comments: null,
  search: {
    provider: 'kbar',
    kbarConfig: {
      searchDocumentsPath: `${process.env.BASE_PATH || ''}/search.json`,
    },
  },
}

module.exports = siteMetadata

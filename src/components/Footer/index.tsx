import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import '@umijs/max';
import React from 'react';
import './index.less';

const Footer: React.FC = () => {
  const defaultMessage = '聪ζ';
  const currentYear = new Date().getFullYear();
  return (
    <div className="footer-container">
      <a 
        href="https://beian.miit.gov.cn/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="beian-link"
      >
        粤ICP备2024313392号
      </a>
      <span className="separator">|</span>
      <span>MIT 协议, 版权所有 © 2024 聪，All rights reserved.</span>
    </div>
    // <DefaultFooter
    //   style={{
    //     background: 'none',
    //   }}
    //   copyright={`${currentYear} ${defaultMessage}`}
    //   links={[
    //     {
    //       key: 'github',
    //       title: '聪ζ',
    //       href: 'https://github.com/lhccong',
    //       blankTarget: true,
    //     },
    //     {
    //       key: 'shortDog',
    //       title: (
    //         <>
    //           <GithubOutlined /> 摸鱼岛🎣
    //         </>
    //       ),
    //       href: 'https://github.com/lhccong/react-frontend-int',
    //       blankTarget: true,
    //     },
    //   ]}
    // />
  );
};
export default Footer;

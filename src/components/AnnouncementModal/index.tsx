import React, {useEffect, useState} from 'react';
import {Modal, Checkbox, Button} from 'antd';
import styles from './index.less';

interface AnnouncementModalProps {
  title?: string;
  content?: string;
  visible?: boolean;
  onClose?: () => void;
  storageKey?: string;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
                                                               title = '系统公告',
                                                               content = '🎉 欢迎使用摸鱼岛！\n\n' +
                                                                 '💡 小贴士：\n' +
                                                                 '✅  使用 Ctrl + Shift + B 可以快速打开老板键，摸鱼更安全！\n\n' +
                                                                 '🌟 支持我们：\n' +
                                                                 '✅ 如果觉得摸鱼岛不错，欢迎给我们的项目点个 Star：\n' +
                                                                 '   https://github.com/lhccong/fish-island-frontend\n\n' +
                                                                 '🤝 参与贡献：\n' +
                                                                 '✅ 如果你想对本项目数据源进行贡献，欢迎在后端项目提交 PR：\n' +
                                                                 '   https://github.com/lhccong/fish-island-backend',
                                                               visible = true,
                                                               onClose,
                                                               storageKey = 'announcement_visible',
                                                             }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 先检查是否已经设置过不再显示
    const shouldShow = localStorage.getItem(storageKey) !== 'false';
    // 只有当应该显示时才设置visible为true
    if (shouldShow && visible) {
      setIsVisible(true);
    }
  }, [visible, storageKey]);

  const handleClose = () => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'false');
    }
    onClose?.();
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onOk={handleClose}
      onCancel={handleClose}
      footer={[
        <div key="footer" className={styles.footer}>
          <Checkbox
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className={styles.checkbox}
          >
            不再显示
          </Checkbox>
          <Button type="primary" onClick={handleClose}>
            我知道了
          </Button>
        </div>
      ]}
      className={styles.announcementModal}
    >
      <div className={styles.content}>
        {content}
      </div>
    </Modal>
  );
};

export default AnnouncementModal;

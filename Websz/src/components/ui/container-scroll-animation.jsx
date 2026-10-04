import React, { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import './container-scroll-animation.css';

export const ContainerScroll = ({ titleComponent, children, variant = 'default' }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const isWebsiteVariant = variant === 'website';

  const scaleDimensions = () => {
    if (isWebsiteVariant) {
      return isMobile ? [0.98, 1] : [0.96, 1];
    }

    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(
    scrollYProgress,
    isWebsiteVariant ? [0, 0.2] : [0, 1],
    isWebsiteVariant ? [8, 0] : [20, 0]
  );
  const scale = useTransform(
    scrollYProgress,
    isWebsiteVariant ? [0, 0.2] : [0, 1],
    scaleDimensions()
  );
  const translate = useTransform(
    scrollYProgress,
    isWebsiteVariant ? [0, 0.2] : [0, 1],
    isWebsiteVariant ? [16, 0] : [0, -100]
  );

  const sectionClass =
    variant === 'website' ? 'csa-section csa-section-website' : 'csa-section';

  return (
    <div className={sectionClass} ref={containerRef}>
      <div className="csa-inner">
        {titleComponent ? <Header translate={translate} titleComponent={titleComponent} /> : null}
        <Card rotate={rotate} scale={scale} variant={variant}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="csa-header"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({ rotate, scale, children, variant = 'default' }) => {
  const cardClass = variant === 'website' ? 'csa-card csa-card-website' : 'csa-card';
  const isWebsiteVariant = variant === 'website';

  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        transformOrigin: isWebsiteVariant ? 'center top' : 'center center',
      }}
      className={cardClass}
    >
      <div className="csa-card-content">{children}</div>
    </motion.div>
  );
};

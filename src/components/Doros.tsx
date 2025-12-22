import React from 'react';
import Doro from './Doro';
import { Doro as DoroType } from '../types/models';

interface DorosProps {
  doros?: DoroType[] | undefined;
}

const Doros = ({ doros }: DorosProps) => (
  <div className="cq-doros-container animate-slide-fwd max-w-lg lg:max-w-2xl mx-auto">
    {doros?.map((doro) => (
      <Doro
        key={doro.id}
        doro={doro}
        className="w-max"
      />
    ))}
  </div>
);

export default Doros;
